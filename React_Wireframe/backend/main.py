from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Tuple, List
from typing import Any
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
from uuid import uuid4

# Optional heavy dependencies (demo-friendly fallbacks if missing)
try:
    import cv2  # type: ignore
except Exception:
    cv2 = None  # type: ignore

try:
    import mediapipe as mp  # type: ignore
    MP_IMPORT_ERROR = None
except Exception as e:
    mp = None  # type: ignore
    MP_IMPORT_ERROR = repr(e)

try:
    import numpy as np  # type: ignore
except Exception:
    np = None  # type: ignore

try:
    import torch  # type: ignore
    from torchvision import transforms  # type: ignore
    from PIL import Image as PILImage
except Exception:
    torch = None  # type: ignore
    transforms = None  # type: ignore
    PILImage = Image

app = FastAPI()

# Enable CORS for local dev (frontend at Vite 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://0.0.0.0:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://0.0.0.0:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class LipstickApplicationRequest(BaseModel):
    image: str  # Base64 encoded image
    lipstick_color: str  # RGB/HEX format like "rgb(199, 44, 72)" or "#c72c48"
    opacity: Optional[float] = 0.7  # Lipstick opacity
    finish: Optional[str] = "matte"  # matte | glossy

class FoundationApplicationRequest(BaseModel):
    image: str  # base64 image string
    foundation_color: str  # e.g. "rgb(224,190,140)" or "#e0be8c"
    finish: Optional[str] = "Satin"  # Matte | Satin | Radiant (optional)
    # restore tunables that prevent bleed (defaults now strict face-only)
    mask_dilate_ratio: Optional[float] = 0.0   # no expansion by default
    ear_wing_ratio: Optional[float] = 0.0      # no ear wings by default
    neck_extension_ratio: Optional[float] = 0.0  # no neck by default
    skin_refine: Optional[bool] = True          # gate mask by skin-color heuristic

class ReserveFormulaMixItem(BaseModel):
    cartridge_id: str
    percentage: float

class ReserveFormulaRequest(BaseModel):
    product_type: str  # foundation | lipstick
    experience_type: Optional[str] = "store"
    launch_mode: Optional[str] = "store"
    shade_name: str
    shade_hex: str
    finish: Optional[str] = None
    cartridges: List[ReserveFormulaMixItem] = []
    expected_wear_profile: Optional[Dict[str, Any]] = None

# Simple health endpoint for connectivity + diagnostics
@app.get("/v1/health")
async def health():
    # Attempt lazy load for reporting if not initialized yet
    if 'mp_face_mesh' not in globals() or mp_face_mesh is None:
        globals()['mp_face_mesh'] = _load_mediapipe_face_mesh_module()
    return {
        "status": "ok",
        "diagnostics": {
            "opencv": bool(cv2),
            "numpy": bool(np),
            "mediapipe": bool(mp),
            "mediapipe_face_mesh_available": bool('mp_face_mesh' in globals() and mp_face_mesh is not None),
            "facemesh_instantiated": bool('face_mesh' in globals() and face_mesh is not None),
            "mediapipe_import_error": MP_IMPORT_ERROR,
            "facemesh_module_load_error": FACE_MESH_MODULE_LOAD_ERROR,
            "facemesh_init_error": FACE_MESH_INIT_ERROR,
            "torch": bool(torch),
            "versions": {
                "opencv": getattr(cv2, "__version__", None) if cv2 else None,
                "numpy": getattr(np, "__version__", None) if np else None,
                "mediapipe": getattr(mp, "__version__", None) if mp else None,
                "torch": getattr(torch, "__version__", None) if torch else None,
            },
            "mode": "full" if ('mp_face_mesh' in globals() and mp_face_mesh is not None and cv2 is not None and np is not None) else "demo"
        }
    }


# Initialize MediaPipe Face Mesh with robust import across versions
mp_face_mesh = None
face_mesh = None
FACE_MESH_MODULE_LOAD_ERROR = None
FACE_MESH_INIT_ERROR = None

def _load_mediapipe_face_mesh_module():
    global FACE_MESH_MODULE_LOAD_ERROR
    # Preferred for modern MediaPipe builds (e.g., 0.10.x)
    if mp is not None:
        try:
            fm = mp.solutions.face_mesh  # type: ignore[attr-defined]
            FACE_MESH_MODULE_LOAD_ERROR = None
            return fm
        except Exception as e0:
            # Continue to legacy import paths below
            FACE_MESH_MODULE_LOAD_ERROR = f"mp.solutions.face_mesh access failed: {e0!r}"

    try:
        from mediapipe.solutions import face_mesh as fm  # type: ignore
        FACE_MESH_MODULE_LOAD_ERROR = None
        return fm
    except Exception as e1:
        try:
            from mediapipe.python.solutions import face_mesh as fm  # type: ignore
            FACE_MESH_MODULE_LOAD_ERROR = None
            return fm
        except Exception as e2:
            FACE_MESH_MODULE_LOAD_ERROR = f"mediapipe.solutions import failed: {e1!r}; mediapipe.python.solutions import failed: {e2!r}"
            return None

@app.on_event("startup")
async def init_facemesh():
    global mp_face_mesh, face_mesh
    global FACE_MESH_INIT_ERROR
    if mp_face_mesh is None:
        mp_face_mesh = _load_mediapipe_face_mesh_module()
    if mp_face_mesh is not None and face_mesh is None:
        try:
            face_mesh = mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.3
            )
            FACE_MESH_INIT_ERROR = None
        except Exception as e1:
            # Retry with safer settings for constrained/cloud environments.
            try:
                face_mesh = mp_face_mesh.FaceMesh(
                    static_image_mode=True,
                    max_num_faces=1,
                    refine_landmarks=False,
                    min_detection_confidence=0.3
                )
                FACE_MESH_INIT_ERROR = f"refine_landmarks=True failed, fallback succeeded: {e1!r}"
            except Exception as e2:
                face_mesh = None
                FACE_MESH_INIT_ERROR = f"FaceMesh init failed: first attempt={e1!r}; fallback={e2!r}"

# ACCURATE MediaPipe Face Mesh Lip Landmarks (verified from official documentation)
# Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png

# UPPER LIP - Outer edge (vermillion border - the edge where lip meets skin)
UPPER_LIP_OUTER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]

# UPPER LIP - Inner edge (where lip meets teeth/mouth interior)
UPPER_LIP_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]

# LOWER LIP - Outer edge (vermillion border)
LOWER_LIP_OUTER = [146, 91, 181, 84, 17, 314, 405, 321, 375, 291]

# LOWER LIP - Inner edge (where lip meets teeth/mouth interior)
LOWER_LIP_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308]

# Complete outer lip contour (what we want to color)
LIPS_OUTER_CONTOUR = [
    # Upper lip outer - left to right
    61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
    # Connect to lower lip - right side
    375, 321, 405, 314, 17, 84, 181, 91, 146,
    # Connect back to start
    61
]

# Complete inner lip contour (mouth opening - avoid coloring)
LIPS_INNER_CONTOUR = [
    # Upper lip inner - left to right
    78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308,
    # Connect to lower lip inner - right side
    324, 318, 402, 317, 14, 87, 178, 88, 95,
    # Connect back to start
    78
]

def decode_base64_image(image_data: str):
    """Decode base64 image to numpy array"""
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        img_bytes = base64.b64decode(image_data)
        if cv2 and np:
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("Failed to decode image")
            return img
        # Fallback: use PIL then convert to BGR-like numpy via list
        pil_img = Image.open(BytesIO(img_bytes)).convert("RGB")
        # Minimal numpy-free fallback: return RGB bytes and size
        # For endpoints needing cv2, we'll early-fallback before use
        return pil_img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

def parse_rgb_color(color_str: str) -> Tuple[int, int, int]:
    """Parse RGB/HEX color string to BGR tuple (OpenCV format)"""
    try:
        color_value = color_str.strip().lower()

        if color_value.startswith('#'):
            hex_value = color_value.lstrip('#')
            if len(hex_value) == 3:
                hex_value = ''.join(ch * 2 for ch in hex_value)
            if len(hex_value) != 6:
                raise ValueError(f"Invalid hex color length: {color_str}")
            r = int(hex_value[0:2], 16)
            g = int(hex_value[2:4], 16)
            b = int(hex_value[4:6], 16)
            return (b, g, r)

        if color_value.startswith('rgba('):
            rgb_values = color_value.replace('rgba(', '').replace(')', '').split(',')[:3]
            r, g, b = [int(float(x.strip())) for x in rgb_values]
            return (b, g, r)

        rgb_values = color_value.replace('rgb(', '').replace(')', '').split(',')
        r, g, b = [int(float(x.strip())) for x in rgb_values[:3]]
        return (b, g, r)  # OpenCV uses BGR
    except Exception as e:
        print(f"Error parsing color {color_str}: {e}. Using default red.")
        return (72, 44, 199)  # Default red in BGR

def get_lip_contours(face_landmarks, img_width: int, img_height: int):
    """
    Extract lip contour coordinates from MediaPipe face mesh
    
    Returns:
        outer_contour: Outer lip boundary (skin edge) - what we color
        inner_contour: Inner lip boundary (mouth opening) - what we avoid
    """
    outer_points = []
    inner_points = []
    
    # Get outer lip contour points
    for idx in LIPS_OUTER_CONTOUR:
        if idx < len(face_landmarks.landmark):
            landmark = face_landmarks.landmark[idx]
            x = int(landmark.x * img_width)
            y = int(landmark.y * img_height)
            outer_points.append([x, y])
    
    # Get inner lip contour points
    for idx in LIPS_INNER_CONTOUR:
        if idx < len(face_landmarks.landmark):
            landmark = face_landmarks.landmark[idx]
            x = int(landmark.x * img_width)
            y = int(landmark.y * img_height)
            inner_points.append([x, y])
    
    if np is None:
        return outer_points, inner_points
    outer = np.array(outer_points, dtype=np.int32)
    inner = np.array(inner_points, dtype=np.int32)

    # Smooth and regularize contours for stability
    def _smooth_contour(poly: Any, eps_ratio: float = 0.004) -> Any:
        if poly.ndim == 2:
            poly_cv = poly.reshape((-1, 1, 2))
        else:
            poly_cv = poly
        arc = cv2.arcLength(poly_cv, True)
        eps = max(1.0, eps_ratio * arc)
        approx = cv2.approxPolyDP(poly_cv, eps, True)
        return approx.reshape(-1, 2).astype(np.int32)

    # Use convex hull for outer to remove minor zig-zags; keep inner approximated
    try:
        if cv2 is not None:
            outer_hull = cv2.convexHull(outer.reshape((-1, 1, 2)))
            outer_smooth = _smooth_contour(outer_hull.reshape(-1, 2), eps_ratio=0.003)
        else:
            outer_smooth = outer
    except Exception:
        outer_smooth = _smooth_contour(outer, eps_ratio=0.003)

    inner_smooth = _smooth_contour(inner, eps_ratio=0.006) if cv2 is not None else inner

    # Ensure we don't over-simplify; fallback to originals if too few points
    if len(outer_smooth) < 12:
        outer_smooth = outer
    if len(inner_smooth) < 8:
        inner_smooth = inner

    return outer_smooth, inner_smooth

def create_lip_mask(img_shape: Tuple[int, int], outer_contour, inner_contour):
    """
    Create a mask for ONLY the lip tissue (between outer and inner contours)
    This ensures we don't color teeth, tongue, or mouth interior
    """
    if cv2 is None or np is None:
        # Minimal fallback: null mask
        return None
    height, width = img_shape[:2]
    
    # Create mask for outer lip boundary
    outer_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(outer_mask, [outer_contour], 255)
    
    # Create mask for inner lip boundary (mouth opening)
    inner_mask = np.zeros((height, width), dtype=np.uint8)
    cv2.fillPoly(inner_mask, [inner_contour], 255)
    
    # Adaptive margin based on image size to avoid bleeding
    h, w = height, width
    px_margin = max(1, int(min(h, w) * 0.003))
    small_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    med_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    # Erode inner to expand mouth opening a touch
    inner_mask = cv2.erode(inner_mask, med_k, iterations=max(1, px_margin // 2))

    # Base lip tissue = outer - inner
    lip_mask = cv2.subtract(outer_mask, inner_mask)

    # Shrink uniformly by a small margin to stay inside vermillion border
    lip_mask = cv2.erode(lip_mask, small_k, iterations=max(1, px_margin))

    # Remove tiny artifacts and smooth contour
    lip_mask = cv2.morphologyEx(lip_mask, cv2.MORPH_OPEN, small_k, iterations=1)
    lip_mask = cv2.morphologyEx(lip_mask, cv2.MORPH_CLOSE, small_k, iterations=1)

    # Feather edges more strongly for natural blending
    lip_mask = cv2.GaussianBlur(lip_mask, (21, 21), 9)
    return lip_mask

def apply_lipstick_color(img, lip_mask, color: Tuple[int, int, int], opacity: float):
    """
    Apply lipstick color to the lip area defined by the mask
    """
    if cv2 is None or np is None or lip_mask is None:
        # Fallback: return original image unchanged without numpy dependency
        return img
    result = img.copy().astype(np.float32)
    
    # Create colored overlay
    color_overlay = np.zeros_like(result, dtype=np.float32)
    color_overlay[:] = color
    
    # Convert mask to 3-channel and normalize
    mask_3channel = cv2.cvtColor(lip_mask, cv2.COLOR_GRAY2BGR).astype(np.float32) / 255.0
    
    # Blend color with original image using mask
    result = result * (1 - mask_3channel * opacity) + color_overlay * mask_3channel * opacity
    result = np.clip(result, 0, 255).astype(np.uint8)
    
    return result

def add_gloss_effect(img, lip_mask, outer_contour):
    """Add glossy/shiny effect to lips for realism."""
    if cv2 is None or np is None or lip_mask is None:
        return img
    result = img.copy().astype(np.float32)

    # Calculate lip dimensions
    lip_center_x = int(np.mean(outer_contour[:, 0]))
    lip_center_y = int(np.mean(outer_contour[:, 1]))
    lip_width = int(np.max(outer_contour[:, 0]) - np.min(outer_contour[:, 0]))

    # Create shine/highlight mask near upper lip center
    shine_mask = np.zeros(img.shape[:2], dtype=np.uint8)
    shine_radius = max(4, int(lip_width * 0.12))
    # Offset towards upper lip
    shine_y_offset = int((np.min(outer_contour[:, 1]) - lip_center_y) * 0.25)

    cv2.circle(shine_mask,
               (lip_center_x, lip_center_y + shine_y_offset),
               shine_radius, 255, -1)

    # Soft highlight and restrict to lip region
    shine_mask = cv2.GaussianBlur(shine_mask, (21, 21), 15)
    shine_mask = cv2.bitwise_and(shine_mask, lip_mask)
    shine_3c = cv2.cvtColor(shine_mask, cv2.COLOR_GRAY2BGR).astype(np.float32) / 255.0

    white = np.ones_like(result, dtype=np.float32) * 255
    # Slightly stronger gloss (~+10%)
    gloss_strength = 0.31
    result = result * (1 - shine_3c * gloss_strength) + white * shine_3c * gloss_strength
    result = np.clip(result, 0, 255).astype(np.uint8)
    return result

def enhance_lip_edges(img, lip_mask, color: Tuple[int, int, int], edge_alpha: float = 0.3):
    """Subtle edge definition with adjustable strength (alpha)."""
    if cv2 is None or np is None or lip_mask is None:
        return img
    base = img.astype(np.float32)
    edges = cv2.Canny(lip_mask, 50, 150)
    kernel = np.ones((2, 2), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)

    # Create overlay colored along edges
    overlay = base.copy()
    edge_color = tuple(int(c * 0.55) for c in color)
    overlay[edges > 0] = edge_color

    # Blend only where edges exist
    mask = (edges > 0).astype(np.float32)
    mask3 = np.dstack([mask, mask, mask])
    result = base * (1 - mask3 * edge_alpha) + overlay * (mask3 * edge_alpha)
    return np.clip(result, 0, 255).astype(np.uint8)

def apply_lipstick_to_lips(img,
                           outer_contour,
                           inner_contour,
                           color: Tuple[int, int, int],
                           opacity: float = 0.7,
                           finish: str = "matte") -> Any:
    """
    Main function to apply lipstick with all effects
    
    Args:
        img: Input image
        outer_contour: Outer lip boundary (skin edge)
        inner_contour: Inner lip boundary (mouth opening)
        color: BGR color tuple
        opacity: Lipstick opacity (0-1)
    
    Returns:
        Image with lipstick applied
    """
    # Ensure correct data type
    if cv2 is None or np is None:
        # Fallback: return original image without numpy dependency
        return img
    img = img.astype(np.uint8)
    
    # Step 1: Create lip mask (only lip tissue)
    lip_mask = create_lip_mask(img.shape, outer_contour, inner_contour)
    
    # Step 2: Apply base lipstick color
    result = apply_lipstick_color(img, lip_mask, color, opacity)

    # Optional glossy highlight
    fin = (finish or "matte").lower()
    if fin == "glossy":
        result = add_gloss_effect(result, lip_mask, outer_contour)

    # Step 4: Enhance lip edges (softer for matte)
    # Nudge strengths (~+10%) for clearer distinction
    edge_alpha = 0.275 if fin == "matte" else 0.44
    result = enhance_lip_edges(result, lip_mask, color, edge_alpha=edge_alpha)
    
    return result

def encode_image_to_base64(img: Any) -> str:
    """Encode numpy array image to base64"""
    if cv2 is not None:
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{img_base64}"
    # PIL fallback
    buff = BytesIO()
    (img if isinstance(img, Image.Image) else Image.fromarray(img[..., ::-1])).save(buff, format="JPEG", quality=92)
    return "data:image/jpeg;base64," + base64.b64encode(buff.getvalue()).decode()

@app.post("/v1/apply-lipstick")
async def apply_lipstick(data: LipstickApplicationRequest):
    """
    Apply lipstick to detected lips in the image
    
    This endpoint:
    - Detects face and lip landmarks using MediaPipe
    - Applies lipstick ONLY to lip tissue (not teeth/tongue)
    - Handles all lip sizes and shapes
    - Works with open/closed mouths
    """
    try:
        # Decode input image
        img = decode_base64_image(data.image)
        # If using PIL fallback, convert to BGR numpy if possible
        if isinstance(img, Image.Image):
            if np is None:
                return {
                    "success": True,
                    "message": "Demo mode active (no OpenCV).",
                    "processed_image": encode_image_to_base64(img),
                    "confidence": 0,
                    "lip_detected": False
                }
            img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        img_height, img_width = img.shape[:2]
        
        # Convert to RGB for MediaPipe
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect face landmarks (robust lazy init)
        if face_mesh is None:
            try:
                fm = _load_mediapipe_face_mesh_module()
                if fm is None:
                    raise RuntimeError("FaceMesh module unavailable")
                try:
                    local_fm = fm.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.3)
                except Exception:
                    local_fm = fm.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=False, min_detection_confidence=0.3)
                results = local_fm.process(img_rgb)
                local_fm.close()
            except Exception:
                return {
                    "success": True,
                    "message": "Demo mode active (no MediaPipe).",
                    "processed_image": encode_image_to_base64(img),
                    "confidence": 0,
                    "lip_detected": False
                }
        else:
            results = face_mesh.process(img_rgb)
        
        if not results.multi_face_landmarks:
            return {
                "success": False,
                "message": "No face detected. Please ensure your face is clearly visible and well-lit.",
                "processed_image": None,
                "confidence": 0,
                "lip_detected": False
            }
        
        # Extract lip contours
        face_landmarks = results.multi_face_landmarks[0]
        outer_contour, inner_contour = get_lip_contours(face_landmarks, img_width, img_height)
        
        # Validate contours via area rather than point count
        try:
            outer_area = cv2.contourArea(outer_contour.reshape((-1, 1, 2)))
            inner_area = cv2.contourArea(inner_contour.reshape((-1, 1, 2)))
        except Exception:
            outer_area, inner_area = 0.0, 0.0

        min_outer_area = max(120.0, img_width * img_height * 0.0005)
        min_inner_area = 20.0
        if outer_area < min_outer_area or inner_area < min_inner_area:
            return {
                "success": False,
                "message": "Could not detect lip landmarks properly. Please try again.",
                "processed_image": None,
                "confidence": 0,
                "lip_detected": False,
                "debug": {
                    "outer_area": outer_area,
                    "inner_area": inner_area,
                    "img_w": img_width,
                    "img_h": img_height
                }
            }
        
        # Parse color
        color = parse_rgb_color(data.lipstick_color)
        
        # Apply lipstick
        result_img = apply_lipstick_to_lips(
            img,
            outer_contour,
            inner_contour,
            color,
            data.opacity,
            data.finish or "matte"
        )
        
        # Encode result
        result_base64 = encode_image_to_base64(result_img)
        
        # Calculate lip dimensions
        lip_width = int(np.max(outer_contour[:, 0]) - np.min(outer_contour[:, 0]))
        lip_height = int(np.max(outer_contour[:, 1]) - np.min(outer_contour[:, 1]))
        
        return {
            "success": True,
            "message": "Lipstick applied successfully to detected lips",
            "processed_image": result_base64,
            "confidence": 95,
            "lip_detected": True,
            "lip_info": {
                "width_pixels": lip_width,
                "height_pixels": lip_height,
                "outer_points_count": len(outer_contour),
                "inner_points_count": len(inner_contour),
                "lip_type": "full" if lip_height > 40 else "thin"
            }
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in apply_lipstick: {error_details}")
        
        return {
            "success": False,
            "message": f"Error processing image: {str(e)}",
            "processed_image": None,
            "confidence": 0,
            "lip_detected": False
        }

# Add neural/deep learning foundation logic (PyTorch)
try:
    if torch is not None:
        foundation_style_model = torch.jit.load("foundation_style_model.pt")
        foundation_style_model.eval()
    else:
        foundation_style_model = None
except Exception:
    foundation_style_model = None

def apply_foundation_neural(img_np, foundation_hex: str, mask):
    """
    Apply foundation using a neural/deep learning model (PyTorch).
    Only applies to masked region.
    """
    if foundation_style_model is None:
        return None

    # Convert numpy image to PIL and then to tensor
    img_pil = PILImage.fromarray(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
    preprocess = transforms.Compose([
        transforms.ToTensor()
    ])
    img_tensor = preprocess(img_pil).unsqueeze(0)  # [1,3,H,W]

    # Parse hex color to normalized RGB tensor
    hex_color = foundation_hex.lstrip('#')
    rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    color_tensor = torch.tensor([c / 255.0 for c in rgb]).view(1, 3, 1, 1)

    # Mask as tensor
    mask_tensor = torch.from_numpy((mask > 0).astype('float32')).unsqueeze(0).unsqueeze(0)  # [1,1,H,W]

    # Run model (assume model expects image, color, mask)
    with torch.no_grad():
        output = foundation_style_model(img_tensor, color_tensor, mask_tensor)
    output_img = output.squeeze(0).permute(1, 2, 0).cpu().numpy()
    output_img = (output_img * 255).clip(0, 255).astype(np.uint8)
    output_img = cv2.cvtColor(output_img, cv2.COLOR_RGB2BGR)
    return output_img

# Landmark sets for exclusion (eyes & mouth) and containment (face oval)
LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
RIGHT_EYE_INDICES = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]
LEFT_BROW_INDICES = [70, 63, 105, 66, 107, 55, 193]
RIGHT_BROW_INDICES = [300, 293, 334, 296, 336, 285, 417]
FACE_OVAL_INDICES = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
]

def _extract_points(landmarks, indices, w, h):
    pts = []
    for idx in indices:
        if idx < len(landmarks.landmark):
            lm = landmarks.landmark[idx]
            pts.append([int(lm.x * w), int(lm.y * h)])
    return np.array(pts, dtype=np.int32)

def _smooth_poly(points: Any, eps_ratio: float = 0.004, use_hull: bool = True) -> Any:
    """Regularize polygon by optional convex hull and approxPolyDP."""
    if points is None or len(points) == 0:
        return points
    try:
        poly = points.reshape((-1, 1, 2))
        if use_hull:
            poly = cv2.convexHull(poly)
        arc = cv2.arcLength(poly, True)
        eps = max(1.0, eps_ratio * arc)
        approx = cv2.approxPolyDP(poly, eps, True)
        res = approx.reshape(-1, 2).astype(np.int32)
        # Fallback if oversimplified
        if len(res) < max(8, len(points) // 3):
            return points
        return res
    except Exception:
        return points

def create_foundation_face_mask(landmarks, w, h, *,
                               dilate_ratio: float = 0.02,
                               ear_wing_ratio: float = 0.35,
                               neck_extension_ratio: float = 0.08,
                               skin_refine: bool = True):
    """Return (expanded_mask, base_face_oval_mask) with eyes/brows/mouth excluded, tunable wings, and guarded by the oval."""
    if cv2 is None or np is None:
        return (None, None)
    oval_pts = _extract_points(landmarks, FACE_OVAL_INDICES, w, h)
    if len(oval_pts) == 0:
        all_pts = []
        for lm in landmarks.landmark:
            all_pts.append([int(lm.x * w), int(lm.y * h)])
        all_pts = np.array(all_pts, dtype=np.int32)
        hull = cv2.convexHull(all_pts)
        oval = hull.reshape(-1, 2)
    else:
        oval = _smooth_poly(oval_pts, eps_ratio=0.003, use_hull=True)

    base_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(base_mask, [oval], 255)
    mask = base_mask.copy()

    try:
        xs = oval[:, 0]; ys = oval[:, 1]
        minx, maxx = int(xs.min()), int(xs.max())
        miny, maxy = int(ys.min()), int(ys.max())
        face_w = max(1, maxx - minx); face_h = max(1, maxy - miny)

        # Clamp tunables; allow truly zero (strict face-only) defaults
        dilate_ratio = float(np.clip(dilate_ratio, 0.0, 0.06)) if dilate_ratio is not None else 0.0
        ear_wing_ratio = float(np.clip(ear_wing_ratio if ear_wing_ratio is not None else 0.0, 0.0, 1.0))
        neck_extension_ratio = float(np.clip(neck_extension_ratio if neck_extension_ratio is not None else 0.0, 0.0, 0.20))

        # Optional expansion: skip entirely for dilate_ratio == 0.0
        if dilate_ratio > 0.0:
            k = int(max(9, min(face_w, face_h) * dilate_ratio))
            if k % 2 == 0:
                k += 1
            expand_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
            expanded = cv2.dilate(mask, expand_kernel, iterations=1)
        else:
            expanded = mask.copy()

        # Ear/temple "wings" (only if ratio > 0)
        ear = np.zeros_like(mask)
        if ear_wing_ratio > 0.0:
            cy = int(miny + face_h * 0.55)
            ear_h = int(face_h * 0.28 * ear_wing_ratio)
            ear_w = int(face_w * 0.16 * ear_wing_ratio)
            cx_l = int(max(0, minx - face_w * 0.03 * ear_wing_ratio))
            cx_r = int(min(w - 1, maxx + face_w * 0.03 * ear_wing_ratio))
            if ear_w > 0 and ear_h > 0:
                cv2.ellipse(ear, (cx_l, cy), (ear_w, ear_h), 0, 0, 360, 255, -1)
                cv2.ellipse(ear, (cx_r, cy), (ear_w, ear_h), 0, 0, 360, 255, -1)
                ear = cv2.GaussianBlur(ear, (0, 0), max(2.0, max(face_w, face_h) * 0.03))

        # Neck extension (only if ratio > 0)
        neck = np.zeros_like(mask)
        if neck_extension_ratio > 0.0:
            y0 = int(max(0, maxy - face_h * 0.02))
            y1 = int(min(h - 1, maxy + face_h * neck_extension_ratio))
            x0 = int(max(0, minx + face_w * 0.20))
            x1 = int(min(w - 1, maxx - face_w * 0.20))
            if y1 > y0 and x1 > x0:
                cv2.rectangle(neck, (x0, y0), (x1, y1), 255, -1)
                neck = cv2.GaussianBlur(neck, (0, 0), max(2.0, max(face_w, face_h) * 0.04))

        mask = cv2.bitwise_or(expanded, ear)
        mask = cv2.bitwise_or(mask, neck)

        guard_size = int(max(7, min(face_w, face_h) * 0.02))
        if guard_size % 2 == 0:
            guard_size += 1
        guard_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (guard_size, guard_size))
        guard = cv2.dilate(base_mask, guard_kernel, iterations=1)
        mask = cv2.bitwise_and(mask, guard)
    except Exception:
        mask = base_mask.copy()

    # Exclude eyes
    left_eye = _extract_points(landmarks, LEFT_EYE_INDICES, w, h)
    right_eye = _extract_points(landmarks, RIGHT_EYE_INDICES, w, h)
    if len(left_eye) > 0:
        cv2.fillPoly(mask, [left_eye], 0)
    if len(right_eye) > 0:
        cv2.fillPoly(mask, [right_eye], 0)

    # Exclude eyebrows
    left_brow = _extract_points(landmarks, LEFT_BROW_INDICES, w, h)
    right_brow = _extract_points(landmarks, RIGHT_BROW_INDICES, w, h)
    if len(left_brow) > 0:
        cv2.fillPoly(mask, [left_brow], 0)
    if len(right_brow) > 0:
        cv2.fillPoly(mask, [right_brow], 0)

    # Exclude mouth (inner + outer)
    outer_lip = _smooth_poly(_extract_points(landmarks, LIPS_OUTER_CONTOUR, w, h), eps_ratio=0.003, use_hull=True)
    inner_lip = _smooth_poly(_extract_points(landmarks, LIPS_INNER_CONTOUR, w, h), eps_ratio=0.006, use_hull=False)
    if len(outer_lip) > 0:
        cv2.fillPoly(mask, [outer_lip], 0)
    if len(inner_lip) > 0:
        cv2.fillPoly(mask, [inner_lip], 0)

    return mask, base_mask

def _skin_mask_ycrcb(img_bgr):
    """Loose skin detector to suppress shirt/hair/background bleed."""
    if cv2 is None or np is None:
        return None
    ycrcb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YCrCb)
    lower = np.array([10, 135, 85], dtype=np.uint8)
    upper = np.array([245, 170, 135], dtype=np.uint8)
    skin = cv2.inRange(ycrcb, lower, upper)
    skin = cv2.medianBlur(skin, 5)
    skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), iterations=1)
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)), iterations=1)
    return skin

def _finalize_face_mask(img_bgr, mask, *, base_face_mask=None, skin_refine: bool = True):
    """Gate expanded mask by skin-color and face oval guard, then feather."""
    if cv2 is None or np is None or mask is None:
        return mask
    m = mask.copy()
    if skin_refine:
        skin = _skin_mask_ycrcb(img_bgr)
        if skin is not None:
            m = cv2.bitwise_and(m, skin)
    if base_face_mask is not None:
        ys, xs = np.where(base_face_mask > 0)
        if xs.size and ys.size:
            guard_k = int(max(7, min(xs.max() - xs.min(), ys.max() - ys.min()) * 0.02))
            if guard_k % 2 == 0:
                guard_k += 1
            guard = cv2.dilate(base_face_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (guard_k, guard_k)), iterations=1)
            m = cv2.bitwise_and(m, guard)
    m = cv2.GaussianBlur(m, (19, 19), 10)
    m[m < 6] = 0  # hard-zero very low alpha
    m = cv2.GaussianBlur(m, (21, 21), 9)
    return m

def refine_mask_with_bisenet(img_bgr, mask):
    """
    Optional BiSeNet-based skin refinement placeholder.

    Currently returns the incoming mask unchanged so that the
    /v1/apply-foundation-mediapipe endpoint works even when no
    segmentation model is available.
    """
    # If you later add a BiSeNet model, integrate it here.
    return mask

def _lab_blend(img_bgr, target_bgr: Tuple[int, int, int], mask):
    if cv2 is None or np is None or mask is None:
        return img_bgr
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    tgt_patch = np.full_like(img_bgr, target_bgr, dtype=np.uint8)
    tgt_lab = cv2.cvtColor(tgt_patch, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(img_lab)
    _, tA, tB = cv2.split(tgt_lab)

    # Use true alpha and hard-zero tiny values
    m_float = (mask.astype(np.float32) / 255.0)
    m_float[m_float < 0.02] = 0.0
    edge_feather = cv2.GaussianBlur(m_float, (31, 31), 12)
    feather = np.maximum(m_float, edge_feather)

    blend_strength = 0.70
    A_new = A.astype(np.float32) * (1 - feather * blend_strength) + tA.astype(np.float32) * (feather * blend_strength)
    B_new = B.astype(np.float32) * (1 - feather * blend_strength) + tB.astype(np.float32) * (feather * blend_strength)
    L_smooth = cv2.bilateralFilter(L, 9, 40, 40)
    L_new = L.astype(np.float32) * (1 - feather * 0.12) + L_smooth.astype(np.float32) * (feather * 0.12)
    lab_new = cv2.merge([
        np.clip(L_new, 0, 255).astype(np.uint8),
        np.clip(A_new, 0, 255).astype(np.uint8),
        np.clip(B_new, 0, 255).astype(np.uint8)
    ])
    result_bgr = cv2.cvtColor(lab_new, cv2.COLOR_LAB2BGR)
    blur_orig = cv2.GaussianBlur(img_bgr, (0, 0), 2.0)
    high_freq = cv2.addWeighted(img_bgr, 1.0, blur_orig, -1.0, 128)
    hf_mask = (feather * 0.35).reshape(feather.shape[0], feather.shape[1], 1)
    result_bgr = cv2.convertScaleAbs(result_bgr.astype(np.float32) + high_freq.astype(np.float32) * hf_mask)
    mask_3c = np.dstack([feather] * 3)
    composite = (img_bgr.astype(np.float32) * (1 - mask_3c) + result_bgr.astype(np.float32) * mask_3c).astype(np.uint8)
    return composite

def _lab_blend_with_finish(img_bgr, target_bgr: Tuple[int, int, int], mask, finish: str):
    if cv2 is None or np is None or mask is None:
        return img_bgr
    finish = (finish or "Satin").lower()
    if finish == "matte":
        blend_strength = 0.54
        luminance_mix = 0.06
        detail_mask_scale = 0.24
        specular_boost = 0.02
    elif finish == "radiant":
        blend_strength = 0.62
        luminance_mix = 0.16
        detail_mask_scale = 0.38
        specular_boost = 0.07
    else:  # satin
        blend_strength = 0.58
        luminance_mix = 0.10
        detail_mask_scale = 0.30
        specular_boost = 0.04

    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    tgt_patch = np.full_like(img_bgr, target_bgr, dtype=np.uint8)
    tgt_lab = cv2.cvtColor(tgt_patch, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(img_lab)
    _, tA, tB = cv2.split(tgt_lab)

    # Use true alpha and hard-zero tiny values
    m_float = (mask.astype(np.float32) / 255.0)
    m_float[m_float < 0.02] = 0.0
    edge_feather = cv2.GaussianBlur(m_float, (31, 31), 12)
    feather = np.maximum(m_float, edge_feather)

    chroma_diff = np.sqrt((A.astype(np.float32) - tA.astype(np.float32))**2 +
                          (B.astype(np.float32) - tB.astype(np.float32))**2) / 255.0
    strength_map = feather * (0.55 + 0.45 * (1.0 - np.clip(chroma_diff, 0.0, 1.0)))

    A_new = A.astype(np.float32) * (1 - strength_map * blend_strength) + tA.astype(np.float32) * (strength_map * blend_strength)
    B_new = B.astype(np.float32) * (1 - strength_map * blend_strength) + tB.astype(np.float32) * (strength_map * blend_strength)

    L_smooth = cv2.bilateralFilter(L, 9, 40, 40)
    L_new = L.astype(np.float32) * (1 - feather * luminance_mix) + L_smooth.astype(np.float32) * (feather * luminance_mix)

    lab_new = cv2.merge([
        np.clip(L_new, 0, 255).astype(np.uint8),
        np.clip(A_new, 0, 255).astype(np.uint8),
        np.clip(B_new, 0, 255).astype(np.uint8)
    ])
    result_bgr = cv2.cvtColor(lab_new, cv2.COLOR_LAB2BGR)

    blur_orig = cv2.GaussianBlur(img_bgr, (0, 0), 2.0)
    high_freq = cv2.addWeighted(img_bgr, 1.0, blur_orig, -1.0, 128)
    hf_mask = (feather * detail_mask_scale).reshape(feather.shape[0], feather.shape[1], 1)
    result_bgr = cv2.convertScaleAbs(result_bgr.astype(np.float32) + high_freq.astype(np.float32) * hf_mask)

    if specular_boost > 0.0:
        h, w = mask.shape[:2]
        spec = np.zeros((h, w), dtype=np.float32)
        cv2.circle(spec, (int(w * 0.62), int(h * 0.42)), int(min(w, h) * 0.08), 1.0, -1)
        cv2.circle(spec, (int(w * 0.38), int(h * 0.44)), int(min(w, h) * 0.07), 0.8, -1)
        spec = cv2.GaussianBlur(spec, (35, 35), 18)
        spec *= feather
        spec3 = np.dstack([spec] * 3)
        white = np.ones_like(result_bgr, dtype=np.float32) * 255
        result_bgr = cv2.convertScaleAbs(result_bgr.astype(np.float32) * (1 - spec3 * specular_boost) +
                                         white * (spec3 * specular_boost))

    mask_3c = np.dstack([feather] * 3)
    composite = (img_bgr.astype(np.float32) * (1 - mask_3c) + result_bgr.astype(np.float32) * mask_3c).astype(np.uint8)
    return composite

@app.post("/v1/apply-foundation-mediapipe")
async def apply_foundation_mediapipe(req: FoundationApplicationRequest):
    """
    Apply foundation using MediaPipe FaceMesh for precise face oval detection.
    Uses the provided hex color and blends it on the detected face oval region for a natural effect.
    """
    try:
        # Decode and prep
        header, encoded = req.image.split(',', 1)
        img_bytes = base64.b64decode(encoded)
        img = Image.open(BytesIO(img_bytes)).convert("RGB")
        # Import mediapipe FaceMesh lazily to be robust across versions
        local_face_mesh_mod = mp_face_mesh if mp_face_mesh is not None else _load_mediapipe_face_mesh_module()

        if cv2 is None or np is None or local_face_mesh_mod is None:
            # Demo fallback: echo image back
            buff = BytesIO()
            img.save(buff, format="JPEG", quality=92)
            result_uri = "data:image/jpeg;base64," + base64.b64encode(buff.getvalue()).decode()
            return {"success": True, "processed_image": result_uri, "face_detected": False, "confidence": 0}
        img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        h, w = img_np.shape[:2]

        # Use the lazily imported module for FaceMesh
        with local_face_mesh_mod.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True) as face_mesh_instance:
            results = face_mesh_instance.process(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
            if not results.multi_face_landmarks:
                return {"success": False, "message": "No face detected", "processed_image": None, "face_detected": False}
            landmarks = results.multi_face_landmarks[0]

        # Build refined mask (strict face-only by default) + skin gating
        mask_with_expansion, oval_mask = create_foundation_face_mask(
            landmarks, w, h,
            dilate_ratio=req.mask_dilate_ratio or 0.0,
            ear_wing_ratio=req.ear_wing_ratio if req.ear_wing_ratio is not None else 0.0,
            neck_extension_ratio=req.neck_extension_ratio if req.neck_extension_ratio is not None else 0.0,
            skin_refine=bool(req.skin_refine) if req.skin_refine is not None else True,
        )
        mask_with_expansion = refine_mask_with_bisenet(img_np, mask_with_expansion)
        face_mask = _finalize_face_mask(
            img_np,
            mask_with_expansion,
            base_face_mask=oval_mask,
            skin_refine=bool(req.skin_refine) if req.skin_refine is not None else True,
        )

        # Robust color parse (rgb/rgba or #hex)
        fc = (req.foundation_color or "").strip().lower()
        if not fc:
            raise ValueError("foundation_color is required")

        if fc.startswith('#'):
            hexc = fc.lstrip('#')
            if len(hexc) == 3:
                hexc = ''.join(ch * 2 for ch in hexc)
            if len(hexc) != 6:
                raise ValueError(f"Invalid hex color: {req.foundation_color}")
            r = int(hexc[0:2], 16)
            g = int(hexc[2:4], 16)
            b = int(hexc[4:6], 16)
            target_bgr = (b, g, r)
        elif fc.startswith('rgba('):
            nums = fc.replace('rgba(', '').replace(')', '').split(',')[:3]
            r, g, b = [int(float(x.strip())) for x in nums]
            target_bgr = (b, g, r)
        else:
            nums = fc.replace('rgb(', '').replace(')', '').split(',')[:3]
            r, g, b = [int(float(x.strip())) for x in nums]
            target_bgr = (b, g, r)

        result_img = _lab_blend_with_finish(img_np, target_bgr, face_mask, req.finish or "Satin")
        result_base64 = encode_image_to_base64(result_img)
        coverage = float(np.count_nonzero(face_mask)) / float(face_mask.size)
        confidence = int(90 + min(7, round(coverage * 100 * 0.08)))  # ~95–97

        return {
            "success": True,
            "processed_image": result_base64,
            "face_detected": True,
            "confidence": confidence
        }
    except Exception as e:
        return {"success": False, "message": str(e), "processed_image": None, "face_detected": False}

@app.post("/v1/skin-full-analysis")
async def skin_full_analysis(req: FoundationApplicationRequest):
    """
    Performs an extended luxury-style skin analysis using captured image and returns metrics & suggestions.
    Re-uses foundation_color field only to maintain request shape (ignored for analysis).
    """
    try:
        header, encoded = req.image.split(',', 1)
        img_bytes = base64.b64decode(encoded)
        img = Image.open(BytesIO(img_bytes)).convert("RGB")
        local_face_mesh_mod = mp_face_mesh if mp_face_mesh is not None else _load_mediapipe_face_mesh_module()

        # Demo-friendly fallback if heavy deps missing
        if cv2 is None or np is None or local_face_mesh_mod is None:
            metrics = {
                "skin_tone_hex": "#D4A574",
                "undertone": "Neutral",
                "texture_score": 86,
                "evenness_score": 88,
                "hydration_score": 80,
                "pore_refinement_score": 82,
                "suggested_shades": ["LV-FND-014", "LV-FND-001"],
                "luxury_recommendations": [
                    "Use a silk-based primer to smooth texture before application.",
                    "Finish with a light-reflecting setting mist for radiance.",
                    "Balance undertone with soft beige modifiers."
                ],
            }
            return {"success": True, "analysis": metrics, "face_detected": False}

        img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        h, w = img_np.shape[:2]

        with local_face_mesh_mod.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True) as fm:
            results = fm.process(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
            if not results.multi_face_landmarks:
                return {"success": False, "message": "No face detected", "analysis": None}
            landmarks = results.multi_face_landmarks[0]

        # Use strict face-only mask for metrics (no wings/neck, no skin gating)
        base_mask, oval_mask = create_foundation_face_mask(
            landmarks, w, h,
            dilate_ratio=0.0,
            ear_wing_ratio=0.0,
            neck_extension_ratio=0.0,
            skin_refine=False,
        )
        face_mask = _finalize_face_mask(img_np, base_mask, base_face_mask=oval_mask, skin_refine=False)
        metrics = compute_skin_metrics(img_np, face_mask)

        return {
            "success": True,
            "analysis": metrics,
            "face_detected": True
        }
    except Exception as e:
        return {"success": False, "message": str(e), "analysis": None, "face_detected": False}

@app.post("/v1/reserve-formula")
async def reserve_formula(req: ReserveFormulaRequest):
    """
    Reserve a selected formula and return an order-ready reservation reference.
    This endpoint is intentionally lightweight and stateless for demo/prototype flows.
    """
    try:
        if not req.shade_name or not req.shade_hex:
            raise HTTPException(status_code=400, detail="shade_name and shade_hex are required")

        product_code = "F" if req.product_type.lower() == "foundation" else "L"
        now = datetime.utcnow()
        reservation_reference = f"AT-{product_code}{now.strftime('%y%m%d')}-{uuid4().hex[:6].upper()}"

        sorted_mix = sorted(req.cartridges, key=lambda item: item.percentage, reverse=True)
        replenishment_suggestions = []
        for index, item in enumerate(sorted_mix[:3]):
            eta_days = 18 + (index * 6)
            priority = "priority" if index == 0 else "secondary" if index == 1 else "support"
            replenishment_suggestions.append({
                "cartridge_id": item.cartridge_id,
                "percentage": round(float(item.percentage), 1),
                "priority": priority,
                "suggest_replenish_in_days": eta_days,
            })

        return {
            "success": True,
            "reservation_reference": reservation_reference,
            "message": "Formula reserved",
            "checkout_url": f"/checkout/reservations/{reservation_reference}",
            "replenishment_suggestions": replenishment_suggestions,
            "expected_wear_profile": req.expected_wear_profile or {},
            "product_type": req.product_type,
            "shade_name": req.shade_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "message": str(e)}

