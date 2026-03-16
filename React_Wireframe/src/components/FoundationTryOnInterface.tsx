import { useRef, useEffect, useMemo, useState, type FC } from "react";
import { apiFetch, parseApiError } from "../config/api";
import FoundationSwatchPanel from './FoundationSwatchPanel';
import CartridgeMarquee, { type Cartridge } from './CartridgeMarquee';

type ShadeMix = {
  cartridgeId: string;
  percentage: number;
};

type SkinToneProfile = 'fair' | 'medium' | 'deep';

interface FoundationShade {
  name: string;
  color: string;
  hex: string;
  mix: ShadeMix[];
}

type CartridgeSet = {
  id: 'set-a' | 'set-b';
  label: string;
  cartridges: Cartridge[];
};

const storeCartridges: Cartridge[] = [
  { id: 'F1', name: 'Porcelain Base', hex: '#F2D6C9' },
  { id: 'F2', name: 'Ivory Base', hex: '#E6BFAE' },
  { id: 'F3', name: 'Warm Beige', hex: '#D7B08F' },
  { id: 'F4', name: 'Honey Beige', hex: '#C89B78' },
  { id: 'F5', name: 'Caramel', hex: '#B88763' },
  { id: 'F6', name: 'Tan Blend', hex: '#9C6B52' },
  { id: 'F7', name: 'Mocha Blend', hex: '#7C5C3E' },
  { id: 'F8', name: 'Deep Neutral', hex: '#5B3A29' },
];

const storeShadeRecipes: Array<{ name: string; mix: ShadeMix[] }> = [
  { name: 'LV Atelier Porcelain 2.5', mix: [{ cartridgeId: 'F2', percentage: 55 }, { cartridgeId: 'F3', percentage: 30 }, { cartridgeId: 'F1', percentage: 15 }] },
  { name: 'LV Atelier Beige 3.2', mix: [{ cartridgeId: 'F3', percentage: 50 }, { cartridgeId: 'F4', percentage: 30 }, { cartridgeId: 'F2', percentage: 20 }] },
  { name: 'LV Atelier Warm 3.8', mix: [{ cartridgeId: 'F4', percentage: 46 }, { cartridgeId: 'F5', percentage: 34 }, { cartridgeId: 'F3', percentage: 20 }] },
  { name: 'LV Signature Neutral 2N', mix: [{ cartridgeId: 'F2', percentage: 60 }, { cartridgeId: 'F3', percentage: 25 }, { cartridgeId: 'F1', percentage: 15 }] },
  { name: 'LV Signature Neutral 3N', mix: [{ cartridgeId: 'F3', percentage: 52 }, { cartridgeId: 'F4', percentage: 28 }, { cartridgeId: 'F2', percentage: 20 }] },
  { name: 'LV Signature Neutral 4N', mix: [{ cartridgeId: 'F4', percentage: 48 }, { cartridgeId: 'F5', percentage: 32 }, { cartridgeId: 'F3', percentage: 20 }] },
  { name: 'LV Velvet Desert 2W', mix: [{ cartridgeId: 'F3', percentage: 56 }, { cartridgeId: 'F4', percentage: 24 }, { cartridgeId: 'F2', percentage: 20 }] },
  { name: 'LV Velvet Tawny 3W', mix: [{ cartridgeId: 'F5', percentage: 44 }, { cartridgeId: 'F4', percentage: 34 }, { cartridgeId: 'F6', percentage: 22 }] },
  { name: 'LV Velvet Toasty 4W', mix: [{ cartridgeId: 'F6', percentage: 42 }, { cartridgeId: 'F5', percentage: 31 }, { cartridgeId: 'F7', percentage: 27 }] },
  { name: 'LV Radiance Honey 4.2', mix: [{ cartridgeId: 'F4', percentage: 50 }, { cartridgeId: 'F5', percentage: 28 }, { cartridgeId: 'F3', percentage: 22 }] },
  { name: 'LV Radiance Amber 5.2', mix: [{ cartridgeId: 'F6', percentage: 45 }, { cartridgeId: 'F7', percentage: 30 }, { cartridgeId: 'F5', percentage: 25 }] },
  { name: 'LV Radiance Deep 6.3', mix: [{ cartridgeId: 'F7', percentage: 48 }, { cartridgeId: 'F8', percentage: 30 }, { cartridgeId: 'F6', percentage: 22 }] },
];

const inhouseCartridgeSets: CartridgeSet[] = [
  {
    id: 'set-a',
    label: 'Set A (Warm Nude)',
    cartridges: [
      { id: 'A1', name: 'Warm Sand', hex: '#D6B28E' },
      { id: 'A2', name: 'Golden Beige', hex: '#B88B67' },
      { id: 'A3', name: 'Rich Amber', hex: '#8E5D43' },
    ],
  },
  {
    id: 'set-b',
    label: 'Set B (Neutral Tan)',
    cartridges: [
      { id: 'B1', name: 'Neutral Linen', hex: '#D9BF9F' },
      { id: 'B2', name: 'Soft Tan', hex: '#A97B59' },
      { id: 'B3', name: 'Deep Mocha', hex: '#6C4633' },
    ],
  },
];

const inhouseGradientRatios = [
  [68, 22, 10],
  [58, 27, 15],
  [48, 32, 20],
  [38, 35, 27],
  [28, 36, 36],
  [18, 34, 48],
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixShadeHex(cartridges: Cartridge[], mix: ShadeMix[]): string {
  const cartridgeMap = new Map(cartridges.map((cartridge) => [cartridge.id, cartridge]));
  let r = 0;
  let g = 0;
  let b = 0;
  for (const item of mix) {
    const cartridge = cartridgeMap.get(item.cartridgeId);
    if (!cartridge) continue;
    const rgb = hexToRgb(cartridge.hex);
    r += rgb.r * (item.percentage / 100);
    g += rgb.g * (item.percentage / 100);
    b += rgb.b * (item.percentage / 100);
  }
  return rgbToHex(r, g, b);
}

function buildStoreShades(recipes: Array<{ name: string; mix: ShadeMix[] }>): FoundationShade[] {
  return recipes.map((recipe) => {
    const hex = mixShadeHex(storeCartridges, recipe.mix);
    return {
      name: recipe.name,
      hex,
      color: hex,
      mix: recipe.mix,
    };
  });
}

function buildInhouseShades(set: CartridgeSet): FoundationShade[] {
  return inhouseGradientRatios.map((ratio, index) => {
    const mix: ShadeMix[] = set.cartridges.map((cartridge, cartridgeIndex) => ({
      cartridgeId: cartridge.id,
      percentage: ratio[cartridgeIndex],
    }));
    const hex = mixShadeHex(set.cartridges, mix);
    return {
      name: `${set.label} ${index < 3 ? `Light ${index + 1}` : `Deep ${index - 2}`}`,
      hex,
      color: hex,
      mix,
    };
  });
}

function estimateLuma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function normalizeSkinToneProfile(value?: string): SkinToneProfile {
  if (!value) return 'medium';
  const v = value.toLowerCase();
  if (v.includes('fair') || v.includes('light') || v.includes('ivory') || v.includes('porcelain')) return 'fair';
  if (v.includes('deep') || v.includes('dark') || v.includes('ebony') || v.includes('rich')) return 'deep';
  return 'medium';
}

function adaptFoundationShadesForTone(shades: FoundationShade[], skinTone: SkinToneProfile): FoundationShade[] {
  const targetLuma = skinTone === 'fair' ? 195 : skinTone === 'deep' ? 110 : 150;
  return [...shades].sort((left, right) => {
    const leftDelta = Math.abs(estimateLuma(left.hex) - targetLuma);
    const rightDelta = Math.abs(estimateLuma(right.hex) - targetLuma);
    return leftDelta - rightDelta;
  });
}

function coerceScore(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function luxuryTier(score: number): 'Atelier Elite' | 'Atelier Signature' | 'Atelier Refinement' {
  if (score >= 86) return 'Atelier Elite';
  if (score >= 72) return 'Atelier Signature';
  return 'Atelier Refinement';
}

function scoreDescriptor(score: number): string {
  if (score >= 92) return 'Exceptional Match';
  if (score >= 84) return 'Refined Match';
  if (score >= 74) return 'Elevated Match';
  if (score >= 64) return 'Harmonized Match';
  return 'Developing Match';
}

function scoreStory(score: number): { label: string; subtle: string } {
  const normalized = coerceScore(score, 0);
  return {
    label: scoreDescriptor(normalized),
    subtle: `(${normalized}%)`,
  };
}

interface FoundationTryOnInterfaceProps {
  onClose?: () => void;
  experienceType?: 'store' | 'in-house';
  skintone?: SkinToneProfile;
  toneConfidence?: number;
  launchMode?: 'store' | 'cartridge' | 'in-house';
}

const FoundationTryOnInterface: FC<FoundationTryOnInterfaceProps> = ({ onClose, experienceType = 'store', skintone = 'medium', toneConfidence = 0, launchMode = 'store' }) => {
  const [selectedInhouseSetId, setSelectedInhouseSetId] = useState<'set-a' | 'set-b'>('set-a');
  const activeInhouseSet = useMemo(
    () => inhouseCartridgeSets.find((set) => set.id === selectedInhouseSetId) || inhouseCartridgeSets[0],
    [selectedInhouseSetId],
  );
  const activeCartridges = useMemo(
    () => (experienceType === 'store' ? storeCartridges : activeInhouseSet.cartridges),
    [experienceType, activeInhouseSet],
  );
  const [detectedSkinTone, setDetectedSkinTone] = useState<SkinToneProfile>(normalizeSkinToneProfile(skintone));
  const effectiveSkinTone = useMemo(() => normalizeSkinToneProfile(detectedSkinTone || skintone), [detectedSkinTone, skintone]);
  const foundationShades = useMemo(() => {
    const baseShades = experienceType === 'store' ? buildStoreShades(storeShadeRecipes) : buildInhouseShades(activeInhouseSet);
    return adaptFoundationShadesForTone(baseShades, effectiveSkinTone);
  }, [experienceType, activeInhouseSet, effectiveSkinTone]);
  const [selectedShade, setSelectedShade] = useState<FoundationShade>(foundationShades[0]);
  // New: finish preset for realism
  const [finish, setFinish] = useState<'Matte' | 'Satin' | 'Radiant'>('Satin');
  const [lightingMode, setLightingMode] = useState<'day' | 'evening'>('day');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [fullAnalysis, setFullAnalysis] = useState<any | null>(null);
  const [fullAnalysisLoading, setFullAnalysisLoading] = useState(false);
  const [reservationMessage, setReservationMessage] = useState<string>('');
  const [reservationReference, setReservationReference] = useState<string>('');
  const [reservationLoading, setReservationLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [faceLandmarks, setFaceLandmarks] = useState<any>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [zoomTarget, setZoomTarget] = useState<number>(1);
  const rafZoomRef = useRef<number | null>(null);

  // Throttle zoom updates to the video with rAF to reduce jitter
  useEffect(() => {
    if (rafZoomRef.current !== null) {
      cancelAnimationFrame(rafZoomRef.current);
    }
    rafZoomRef.current = requestAnimationFrame(() => {
      setZoom(zoomTarget);
      rafZoomRef.current = null;
    });
    return () => {
      if (rafZoomRef.current !== null) {
        cancelAnimationFrame(rafZoomRef.current);
        rafZoomRef.current = null;
      }
    };
  }, [zoomTarget]);

  // Track if a shade is selected
  const [shadeSelected, setShadeSelected] = useState<boolean>(true);
  const [sliderPos, setSliderPos] = useState(50); // before/after slider % (0-100)

  useEffect(() => {
    if (foundationShades.length === 0) return;
    setSelectedShade((previousShade) => {
      const matchedShade = foundationShades.find(
        (shade) => shade.hex.toLowerCase() === previousShade.hex.toLowerCase(),
      );
      return matchedShade || foundationShades[0];
    });
    setShadeSelected(true);
  }, [foundationShades]);

  useEffect(() => {
    setDetectedSkinTone(normalizeSkinToneProfile(skintone));
  }, [skintone]);

  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
      setErrorMessage('');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => undefined);
        };
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown camera error';
      setErrorMessage(`Unable to access camera. Please check permissions. (${reason})`);
    }
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  }, []);

  // Use MediaPipe FaceMesh to detect face landmarks on captured image
  const detectFaceLandmarks = async (image: HTMLImageElement) => {
    // Dynamically import mediapipe facemesh
    const mp = await import('@mediapipe/face_mesh');
    // Fix: FaceMesh is the class, not a property of FaceMesh
    const faceMesh = new mp.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    return new Promise<any>((resolve) => {
      faceMesh.onResults((results: any) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          resolve(results.multiFaceLandmarks[0]);
        } else {
          resolve(null);
        }
      });
      faceMesh.send({ image });
    });
  };

  // Draw foundation overlay using detected landmarks
  const drawFoundationOverlay = (img: HTMLImageElement, landmarks: any, hexColor: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (landmarks && landmarks.length > 0) {
      // Compute face bounding box from landmarks
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of landmarks) {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      const faceW = Math.max(10, maxX - minX);
      const faceH = Math.max(10, maxY - minY);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // Expand bbox to include forehead, ears, and neck (heuristics)
      const expandLeft = faceW * 0.10;   // ears
      const expandRight = faceW * 0.10;  // ears
      const expandTop = faceH * 0.12;    // forehead
      const expandBottom = faceH * 0.18; // neck

      const boxX = Math.max(0, minX - expandLeft);
      const boxY = Math.max(0, minY - expandTop);
      const boxW = Math.min(canvas.width - boxX, faceW + expandLeft + expandRight);
      const boxH = Math.min(canvas.height - boxY, faceH + expandTop + expandBottom);

      // Rounded-rect path for smoother edges
      const radius = Math.max(8, Math.min(boxW, boxH) * 0.12);
      const path = new Path2D();
      path.moveTo(boxX + radius, boxY);
      path.lineTo(boxX + boxW - radius, boxY);
      path.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
      path.lineTo(boxX + boxW, boxY + boxH - radius);
      path.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
      path.lineTo(boxX + radius, boxY + boxH);
      path.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
      path.lineTo(boxX, boxY + radius);
      path.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);

      // Feathered fill with realistic blending
      ctx.save();
      ctx.clip(path);
      // Multiply blend gives natural foundation look
      ctx.globalCompositeOperation = 'multiply';
      // Base fill with low alpha
      ctx.fillStyle = hexColor && hexColor.startsWith('#') ? hexColor : '#bfa77a';
      ctx.globalAlpha = finishLightingProfile.fillAlpha;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Soft radial feather toward center to avoid hard edges
      // Helper: convert hex to rgb
      const toRgb = (hex: string) => {
        const h = hex.replace('#','');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
      };
      const { r, g, b } = toRgb(hexColor && hexColor.startsWith('#') ? hexColor : '#bfa77a');

      const grad = ctx.createRadialGradient(
        cx,
        cy - faceH * 0.08,
        Math.min(faceW, faceH) * 0.15,
        cx,
        cy - faceH * 0.08,
        Math.max(boxW, boxH) * 0.6
      );
      // Blend color stops from stronger center to softer edges
      grad.addColorStop(0.0, `rgba(${r},${g},${b},0.45)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
      ctx.globalAlpha = finishLightingProfile.featherAlpha;
      ctx.fillStyle = grad;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Subtle highlight for realistic finish
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(cx, cy - faceH * 0.10, 0, cx, cy - faceH * 0.10, faceW * 0.35);
      glow.addColorStop(0, 'rgba(255,255,255,0.10)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = finishLightingProfile.glowAlpha;
      ctx.fillStyle = glow;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  // Use backend to apply foundation with MediaPipe
  const applyFoundationWithBackend = async (imageData: string, foundationColor: string) => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const normalizedColor = foundationColor.trim();
      if (!normalizedColor) {
        throw new Error('No foundation shade selected');
      }
      const response = await apiFetch('/v1/apply-foundation-mediapipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          foundation_color: normalizedColor,
          finish // pass preset
        })
      });
      if (!response.ok) {
        const detail = await parseApiError(response);
        throw new Error(detail);
      }
      const result = await response.json();
      if (result.success && result.processed_image) {
        setProcessedImage(result.processed_image);
        setFaceDetected(result.face_detected);
        setConfidence(result.confidence || 0);
      } else {
        setErrorMessage(result.message || 'Failed to detect face. Please try again.');
        setProcessedImage(null);
        setFaceDetected(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error applying foundation:', error);
      setErrorMessage(`Failed to process image: ${message}`);
      setProcessedImage(null);
      setFaceDetected(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // 📸 Capture Photo button logic
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    setErrorMessage('');
    // Always use hex code
    applyFoundationWithBackend(imageData, selectedShade.hex);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setFaceDetected(false);
    setErrorMessage('');
    setConfidence(0);
    setFaceLandmarks(null);
    setIsProcessing(false);
    setFullAnalysis(null);
    setFullAnalysisLoading(false);
    setFinish('Satin');
    setLightingMode('day');
    setSelectedShade(foundationShades[0]);
    setShadeSelected(true);
    setZoomTarget(1);
    setZoom(1);
    setSliderPos(50);
    startCamera();
  };

  // Update foundation shade when user selects a new shade
  useEffect(() => {
    if (capturedImage) {
      applyFoundationWithBackend(capturedImage, selectedShade.hex);
    }
    // eslint-disable-next-line
  }, [selectedShade, finish]);

  // When user selects a new shade, redraw overlay if image and landmarks exist
  useEffect(() => {
    if (capturedImage && faceLandmarks) {
      const img = new window.Image();
      img.onload = () => {
        // Always use hex code
        drawFoundationOverlay(img, faceLandmarks, selectedShade.hex);
        setProcessedImage(canvasRef.current?.toDataURL('image/jpeg') || null);
      };
      img.src = capturedImage;
    }
    // eslint-disable-next-line
  }, [selectedShade, faceLandmarks]);

  const handleShadeSelect = (shade: FoundationShade) => {
    setSelectedShade(shade);
    setShadeSelected(true);
    // If in-house, command device to dispense from the selected 3-cartridge mix
    if (experienceType === 'in-house') {
      apiFetch('/device/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'foundation',
          selected_hex: shade.hex,
          cartridges: shade.mix.map((mixItem) => mixItem.cartridgeId),
          proportions: shade.mix.map((mixItem) => mixItem.percentage),
          quantity_ml: 0.5,
        }),
      }).catch(() => console.warn('Device dispense call failed (simulated).'));
    }
    // Immediately show the selected shade on the captured image (if available)
    if (capturedImage) {
      const img = new window.Image();
      img.onload = () => {
        detectFaceLandmarks(img).then(landmarks => {
          setFaceLandmarks(landmarks);
          if (landmarks) {
            drawFoundationOverlay(img, landmarks, shade.hex);
            setProcessedImage(canvasRef.current?.toDataURL('image/jpeg') || null);
          }
        });
      };
      img.src = capturedImage;
    }
  };

  // Live foundation overlay using face-api.js landmarks (eyes/lips exclusion)
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    (async () => {
      if (!videoRef.current || !liveOverlayCanvasRef.current || capturedImage) return;
      const faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      ]);

      const run = async () => {
        if (cancelled || !videoRef.current || !liveOverlayCanvasRef.current) return;
        const video = videoRef.current;
        const overlay = liveOverlayCanvasRef.current;
        if (!video.videoWidth || !video.videoHeight) {
          timer = window.setTimeout(run, 80);
          return;
        }
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        const ctx = overlay.getContext('2d');
        if (!ctx) {
          timer = window.setTimeout(run, 80);
          return;
        }
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        if (!det || !det.landmarks) {
          // Fallback: soft radial overlay centered on face area
          const cx = overlay.width / 2;
          const cy = overlay.height * 0.45;
          const faceW = overlay.width * 0.35;
          const faceH = overlay.height * 0.45;
          const boxX = cx - faceW / 2;
          const boxY = cy - faceH / 2;
          const boxW = faceW;
          const boxH = faceH;
          const radius = Math.max(8, Math.min(boxW, boxH) * 0.14);
          const path = new Path2D();
          path.moveTo(boxX + radius, boxY);
          path.lineTo(boxX + boxW - radius, boxY);
          path.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
          path.lineTo(boxX + boxW, boxY + boxH - radius);
          path.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
          path.lineTo(boxX + radius, boxY + boxH);
          path.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
          path.lineTo(boxX, boxY + radius);
          path.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);

          ctx.save();
          ctx.clip(path);
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = finishLightingProfile.fillAlpha;
          ctx.fillStyle = selectedShade.hex;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.globalCompositeOperation = 'screen';
          const glow = ctx.createRadialGradient(cx, cy - faceH * 0.10, 0, cx, cy - faceH * 0.10, faceW * 0.35);
          glow.addColorStop(0, 'rgba(255,255,255,0.10)');
          glow.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = finishLightingProfile.glowAlpha;
          ctx.fillStyle = glow;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.restore();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          timer = window.setTimeout(run, 120);
          return;
        }
        const positions = det.landmarks.positions;
        // Compute face bbox
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of positions) {
          const x = p.x;
          const y = p.y;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        const faceW = Math.max(10, maxX - minX);
        const faceH = Math.max(10, maxY - minY);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        // Expand to include forehead/ears/neck
        const expandLeft = faceW * 0.12;
        const expandRight = faceW * 0.12;
        const expandTop = faceH * 0.15;
        const expandBottom = faceH * 0.22;
        const boxX = Math.max(0, minX - expandLeft);
        const boxY = Math.max(0, minY - expandTop);
        const boxW = Math.min(overlay.width - boxX, faceW + expandLeft + expandRight);
        const boxH = Math.min(overlay.height - boxY, faceH + expandTop + expandBottom);

        // Rounded rectangle path
        const radius = Math.max(8, Math.min(boxW, boxH) * 0.14);
        const path = new Path2D();
        path.moveTo(boxX + radius, boxY);
        path.lineTo(boxX + boxW - radius, boxY);
        path.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        path.lineTo(boxX + boxW, boxY + boxH - radius);
        path.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        path.lineTo(boxX + radius, boxY + boxH);
        path.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        path.lineTo(boxX, boxY + radius);
        path.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);

        // Fill with multiply blending
        ctx.save();
        ctx.clip(path);
        ctx.globalCompositeOperation = 'multiply';
        const toRgb = (hex: string) => {
          const h = hex.replace('#','');
          const bigint = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          return { r, g, b };
        };
        const { r, g, b } = toRgb(selectedShade.hex);
        ctx.globalAlpha = finishLightingProfile.fillAlpha;
        ctx.fillStyle = selectedShade.hex;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Feathered gradient toward edges
        const grad = ctx.createRadialGradient(
          cx,
          cy - faceH * 0.08,
          Math.min(faceW, faceH) * 0.15,
          cx,
          cy - faceH * 0.08,
          Math.max(boxW, boxH) * 0.6
        );
        grad.addColorStop(0.0, `rgba(${r},${g},${b},0.45)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
        grad.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
        ctx.globalAlpha = finishLightingProfile.featherAlpha;
        ctx.fillStyle = grad;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Subtle glow based on finish
        ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(cx, cy - faceH * 0.10, 0, cx, cy - faceH * 0.10, faceW * 0.35);
        glow.addColorStop(0, 'rgba(255,255,255,0.10)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = finishLightingProfile.glowAlpha;
        ctx.fillStyle = glow;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Exclude eyes and lips using destination-out
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        const drawPolygon = (pts: any[]) => {
          if (!pts || pts.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.fill();
        };
        const lips = det.landmarks.getMouth();
        const leftEye = det.landmarks.getLeftEye();
        const rightEye = det.landmarks.getRightEye();
        // Slightly expand eye polygons to include eyelids
        const expand = (pts: any[], amt: number) => pts.map(p => ({ x: p.x + (p.x - cx) * amt, y: p.y + (p.y - cy) * amt }));
        drawPolygon(lips as any);
        drawPolygon(expand(leftEye as any, 0.08));
        drawPolygon(expand(rightEye as any, 0.08));

        // Restore to normal for next frame
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';

        timer = window.setTimeout(run, 80); // ~12.5 fps for lightweight processing
      };
      run();
    })();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [selectedShade.hex, finish, lightingMode, capturedImage]);

  // Close button handler
  const handleClose = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setFaceDetected(false);
    setConfidence(0);
    setErrorMessage('');
    setSelectedShade(foundationShades[0]);
    setShadeSelected(true);
    if (onClose) {
      onClose();
    }
  };

  // Full analysis handler (dummy implementation)
  const handleFullAnalysis = async () => {
    if (!capturedImage) {
      setFullAnalysis({ error: 'Capture an image first.' });
      return;
    }
    setFullAnalysisLoading(true);
    try {
      const resp = await apiFetch('/v1/skin-full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          foundation_color: selectedShade.hex
        })
      });
      const data = await resp.json();
      if (data.success) {
        setFullAnalysis(data.analysis);
        const toneHint = data.analysis?.undertone || data.analysis?.skin_tone || data.analysis?.skin_tone_hex;
        setDetectedSkinTone(normalizeSkinToneProfile(String(toneHint || skintone)));
      } else {
        setFullAnalysis({ error: data.message || 'Analysis failed.' });
      }
    } catch (e) {
      setFullAnalysis({ error: (e as Error).message });
    } finally {
      setFullAnalysisLoading(false);
    }
  };

  const cartridgeNameMap = useMemo(
    () => new Map(activeCartridges.map((cartridge) => [cartridge.id, cartridge.name])),
    [activeCartridges],
  );

  const marqueeProposedShades = useMemo(
    () => foundationShades.map((shade) => ({ name: shade.name, hex: shade.hex })),
    [foundationShades],
  );

  const alternativeShades = useMemo(() => {
    if (foundationShades.length <= 1) return [] as Array<{ shade: FoundationShade; deltaLuma: number }>;

    const selectedLuma = estimateLuma(selectedShade.hex);
    const candidates = foundationShades
      .filter((shade) => shade.name !== selectedShade.name)
      .map((shade) => ({
        shade,
        deltaLuma: Math.round(estimateLuma(shade.hex) - selectedLuma),
      }));

    const nearestLighter = [...candidates]
      .filter((candidate) => candidate.deltaLuma > 0)
      .sort((left, right) => left.deltaLuma - right.deltaLuma)[0];

    const nearestDarker = [...candidates]
      .filter((candidate) => candidate.deltaLuma < 0)
      .sort((left, right) => right.deltaLuma - left.deltaLuma)[0];

    const nearestAny = [...candidates].sort(
      (left, right) => Math.abs(left.deltaLuma) - Math.abs(right.deltaLuma),
    );

    const picked = [nearestLighter, nearestDarker, ...nearestAny].filter(
      (candidate): candidate is { shade: FoundationShade; deltaLuma: number } => !!candidate,
    );

    const seen = new Set<string>();
    return picked.filter((candidate) => {
      if (seen.has(candidate.shade.name)) return false;
      seen.add(candidate.shade.name);
      return true;
    }).slice(0, 2);
  }, [foundationShades, selectedShade]);

  const isCartridgeSelectionMode = launchMode === 'cartridge';

  const luxuryAnalysisView = useMemo(() => {
    if (!fullAnalysis || fullAnalysis.error) return null;

    const textureScore = coerceScore(fullAnalysis.texture_score, 78);
    const evennessScore = coerceScore(fullAnalysis.evenness_score, 80);
    const hydrationScore = coerceScore(fullAnalysis.hydration_score, 76);
    const poreScore = coerceScore(fullAnalysis.pore_refinement_score, 74);
    const complexionIndex = Math.round((textureScore + evennessScore + hydrationScore + poreScore) / 4);
    const tier = luxuryTier(complexionIndex);

    const undertone = String(fullAnalysis.undertone || 'Neutral');
    const toneHex = String(fullAnalysis.skin_tone_hex || selectedShade.hex);
    const confidenceValue = toneConfidence > 0 ? toneConfidence : coerceScore(fullAnalysis.confidence, 89);

    const finishingRecommendation = hydrationScore < 60
      ? 'Satin finish is recommended to preserve comfort and blur dryness.'
      : hydrationScore > 84
        ? 'Radiant finish is recommended to elevate glow while keeping natural depth.'
        : 'Matte or Satin finish will both hold well; choose based on occasion lighting.';

    const refinementPriority = poreScore < 70
      ? 'Prime the T-zone for smoother diffusion and reduced pore visibility.'
      : evennessScore < 72
        ? 'Use a thin corrective pass on high-contrast zones before final blend.'
        : 'Maintain a single uniform pass; your base already reads balanced.';

    const suggestedShades = Array.isArray(fullAnalysis.suggested_shades)
      ? fullAnalysis.suggested_shades.filter((shade: unknown) => typeof shade === 'string' && shade.trim().length > 0)
      : [];

    const conciergeTips = Array.isArray(fullAnalysis.luxury_recommendations)
      ? fullAnalysis.luxury_recommendations.filter((tip: unknown) => typeof tip === 'string' && tip.trim().length > 0)
      : [];

    const fallbackShadeSuggestions = alternativeShades.map((candidate) => candidate.shade.name);

    return {
      textureScore,
      evennessScore,
      hydrationScore,
      poreScore,
      complexionIndex,
      tier,
      undertone,
      toneHex,
      confidenceValue,
      finishingRecommendation,
      refinementPriority,
      suggestedShades: suggestedShades.length > 0 ? suggestedShades : fallbackShadeSuggestions,
      conciergeTips,
    };
  }, [fullAnalysis, selectedShade.hex, toneConfidence, alternativeShades]);

  const confidenceStory = useMemo(() => scoreStory(confidence || 89), [confidence]);
  const skinIndexStory = useMemo(() => scoreStory(85), []);
  const highlightStory = useMemo(() => scoreStory(80), []);

  const finishLightingProfile = useMemo(() => {
    const dayMultiplier = lightingMode === 'day' ? 1 : 1.12;
    const baseAlpha = finish === 'Radiant' ? 0.33 : finish === 'Satin' ? 0.35 : 0.38;
    const gradientAlpha = finish === 'Radiant' ? 0.24 : finish === 'Satin' ? 0.18 : 0.14;
    const glowAlpha = finish === 'Radiant' ? 0.25 : finish === 'Satin' ? 0.15 : 0.08;
    return {
      fillAlpha: Math.min(0.5, baseAlpha * dayMultiplier),
      featherAlpha: Math.min(0.35, gradientAlpha * dayMultiplier),
      glowAlpha: Math.min(0.4, glowAlpha * (lightingMode === 'day' ? 0.95 : 1.18)),
      mediaFilter: lightingMode === 'day'
        ? 'brightness(1.01) saturate(1.02)'
        : 'brightness(0.95) contrast(1.05) saturate(1.06)',
    };
  }, [finish, lightingMode]);

  const replenishmentPlan = useMemo(() => {
    return [...selectedShade.mix]
      .sort((left, right) => right.percentage - left.percentage)
      .map((mixItem, index) => ({
        cartridgeId: mixItem.cartridgeId,
        cartridgeName: cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId,
        percentage: mixItem.percentage,
        priority: index === 0 ? 'Priority refill' : index === 1 ? 'Secondary refill' : 'Support refill',
        etaDays: index === 0 ? 18 : index === 1 ? 24 : 30,
      }));
  }, [selectedShade.mix, cartridgeNameMap]);

  const expectedWearProfile = useMemo(() => {
    const baseHours = finish === 'Matte' ? 10 : finish === 'Satin' ? 8 : 7;
    const confidenceBoost = (luxuryAnalysisView?.confidenceValue || confidence || 82) >= 88 ? 1 : 0;
    const minHours = Math.max(6, baseHours - 1 + confidenceBoost);
    const maxHours = minHours + 2;
    return {
      longevity: `${minHours}-${maxHours}h`,
      touchUpWindow: finish === 'Radiant' ? 'Touch-up every 3-4h' : finish === 'Satin' ? 'Touch-up every 4-5h' : 'Touch-up every 5-6h',
      bestSetting: finish === 'Radiant'
        ? 'Best in evening and event lighting'
        : finish === 'Matte'
          ? 'Best for long daytime wear and humidity control'
          : 'Best for day-to-evening balanced wear',
    };
  }, [finish, luxuryAnalysisView, confidence]);

  const handleReserveFormula = async () => {
    setReservationLoading(true);
    setReservationMessage('');
    setReservationReference('');
    try {
      const response = await apiFetch('/v1/reserve-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: 'foundation',
          experience_type: experienceType,
          launch_mode: launchMode,
          shade_name: selectedShade.name,
          shade_hex: selectedShade.hex,
          finish,
          cartridges: selectedShade.mix.map((mixItem) => ({
            cartridge_id: mixItem.cartridgeId,
            percentage: mixItem.percentage,
          })),
          expected_wear_profile: expectedWearProfile,
        }),
      });
      const result = await response.json() as {
        success?: boolean;
        reservation_reference?: string;
        message?: string;
      };

      if (!response.ok || !result.success || !result.reservation_reference) {
        throw new Error(result.message || 'Reservation failed');
      }

      const primary = replenishmentPlan[0];
      setReservationReference(result.reservation_reference);
      setReservationMessage(
        `Reserved ${selectedShade.name}. ${primary?.cartridgeName || 'Primary cartridge'} suggested in ${primary?.etaDays || 21} days.`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown reservation error';
      setReservationMessage(`Unable to reserve this formula right now. (${reason})`);
    } finally {
      setReservationLoading(false);
    }
  };

  useEffect(() => {
    setReservationMessage('');
    setReservationReference('');
  }, [selectedShade.name, finish]);

  return (
    <div className="fixed inset-0 z-50 lux-page overflow-y-auto px-4 sm:px-6 py-6">
      <div
        className="relative w-full max-w-5xl mx-auto my-6 rounded-3xl lux-card p-4 sm:p-6 md:p-8 flex flex-col gap-6 min-h-0"
        style={{ fontFamily: 'serif' }}
      >
        {/* Header Row: Live tone + Close */}
        <div className="w-full flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-full border border-[#bfa77a] bg-white/90 px-3 py-1 text-xs">
            <span className="font-semibold text-[#6d4c1e]">Live tone:</span>
            <span className="font-bold text-[#bfa77a] capitalize">{effectiveSkinTone}</span>
            {toneConfidence > 0 && <span className="text-[#6d4c1e]/70">({toneConfidence}%)</span>}
            {launchMode === 'cartridge' && (
              <span className="rounded-full border border-[#d4af37] bg-[#fffbe6] px-2 py-0.5 font-semibold text-[#6d4c1e]">
                Refill Mode
              </span>
            )}
          </div>

          <button
            className="bg-[#d4af37] text-white rounded-full p-2 shadow hover:bg-black lux-cta-transition"
            onClick={handleClose}
          >
            &#10005;
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row gap-6 w-full">
          {/* Left Section - Camera & Swatch Panel */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <div className="relative w-full max-w-md mx-auto luxury-border overflow-hidden rounded-2xl">
              {/* Brand logo badge */}
              <div className="pointer-events-none absolute top-2 left-2 z-10">
                <img
                  src="/assets/brand-logo.svg"
                  alt="Brand Logo"
                  className="h-8 w-8 object-contain drop-shadow-md rounded-full border border-[#d4af37] bg-white/90"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {/* Finish selector above camera */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-[#6d4c1e]">Finish</label>
                  <select
                    value={finish}
                    onChange={(e) => setFinish(e.target.value as 'Matte' | 'Satin' | 'Radiant')}
                    className="text-sm border border-[#bfa77a] rounded-lg px-3 py-1 bg-white/95 text-[#5b4632] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  >
                    <option>Matte</option>
                    <option>Satin</option>
                    <option>Radiant</option>
                  </select>
                </div>
                <div className="inline-flex rounded-full border border-[#d9c6a4] overflow-hidden self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setLightingMode('day')}
                    className={`px-3 py-1 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${lightingMode === 'day' ? 'bg-[#1c1a17] text-[#f7f2ea]' : 'bg-white/90 text-[#6d4c1e]'}`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightingMode('evening')}
                    className={`px-3 py-1 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${lightingMode === 'evening' ? 'bg-[#1c1a17] text-[#f7f2ea]' : 'bg-white/90 text-[#6d4c1e]'}`}
                  >
                    Evening
                  </button>
                </div>
              </div>

              {/* Camera Section Label */}
              {/* <div className="w-full text-center py-1 bg-gray-100 text-gray-700 font-semibold rounded mb-2">
                Camera Section
              </div> */}
              {/* Video Element */}
              {!capturedImage && (
                <>
                  {/* Zoom Slider */}
                  <div className="mb-3 w-[95%] mx-auto lux-card rounded-xl px-4 py-2 zoom-control-card">
                    <div className="flex items-center justify-between text-xs text-[#6d4c1e] mb-1 zoom-control-meta">
                      <span>Zoom</span>
                      <span>{Math.round(zoomTarget * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.1}
                      value={zoomTarget}
                      onChange={(e) => setZoomTarget(parseFloat(e.target.value))}
                      className="w-full accent-[#bfa77a] zoom-control-slider"
                    />
                  </div>
                  <div className="w-full h-64 md:h-80 overflow-hidden flex items-center justify-center bg-black/5 relative camera-lux-frame" style={{ willChange: 'transform' }}>
                    {/* Decorative inner frame */}
                    <div className="camera-lux-inner-frame" />
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: `translateZ(0) scale(${zoom})`, transformOrigin: 'center center', backfaceVisibility: 'hidden', filter: finishLightingProfile.mediaFilter, transition: 'filter 420ms cubic-bezier(0.22,1,0.36,1)' }}
                    />
                    {/* Live foundation overlay canvas */}
                    <canvas
                      ref={liveOverlayCanvasRef}
                      className="absolute inset-0 w-full h-full"
                      style={{ pointerEvents: 'none', borderRadius: '0.75rem' }}
                    />
                  </div>
                  {/* Hidden canvas for snapshot */}
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Capture Button: Only show after a shade is selected */}
                  {shadeSelected && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={captureSnapshot}
                        className="main-action-btn camera-capture-btn"
                      >
                        📸 Monogram Portrait
                      </button>
                    </div>
                  )}
                </>
              )}
              {/* Error Message */}
              {errorMessage && (
                <div className="mt-4 w-full max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
                    <span className="font-bold text-yellow-800 block mb-1">Error Message:</span>
                    <p className="text-yellow-800 text-sm">⚠️ {errorMessage}</p>
                    {!capturedImage && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="text-xs px-3 py-1.5 rounded-lg border border-[#bfa77a] text-[#5b4632] hover:bg-[#bfa77a] hover:text-white lux-cta-transition"
                        >
                          Retry Camera
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Processed Image Preview: Show below camera after capture */}
              {capturedImage && (
                <div className="mt-6 w-full max-w-md mx-auto">
                  <div className="lux-card rounded-xl p-4">
                    <div className="font-bold text-[#bfa77a] mb-2">Processed Image Preview</div>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-[#6d4c1e]">
                          Your Look: {selectedShade.name}
                        </h3>
                        {faceDetected && confidence > 0 && (
                          <p className="text-xs text-[#bfa77a]">
                            ✓ {confidenceStory.label} <span className="text-[#6d4c1e]/70">{confidenceStory.subtle}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleRetake}
                        className="text-sm px-3 py-1 rounded-lg border border-[#bfa77a] text-[#5b4632] hover:bg-[#bfa77a] hover:text-white lux-cta-transition"
                      >
                        Retake
                      </button>
                    </div>

                    {/* Before/After slider comparison */}
                    {!isProcessing && (
                      <div className="relative w-full overflow-hidden rounded-lg shadow-md" style={{ position: 'relative' }}>
                        {/* Before image (original) */}
                        <img
                          src={capturedImage}
                          alt="Before"
                          className="w-full h-auto block"
                          style={{ filter: finishLightingProfile.mediaFilter, transition: 'filter 420ms cubic-bezier(0.22,1,0.36,1)' }}
                        />
                        {/* After image (processed) clipped by slider */}
                        <img
                          src={processedImage || capturedImage}
                          alt="After"
                          className="w-full h-auto block absolute top-0 left-0"
                          style={{
                            clipPath: `inset(0 ${Math.max(0, 100 - sliderPos)}% 0 0)`,
                            transition: 'clip-path 240ms cubic-bezier(0.22,1,0.36,1), filter 420ms cubic-bezier(0.22,1,0.36,1)',
                            filter: finishLightingProfile.mediaFilter,
                          }}
                        />
                      </div>
                    )}

                    {/* Slider moved below the image to avoid overlaying the face */}
                    {!isProcessing && (
                      <div className="mt-3 px-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sliderPos}
                          onChange={(e) => setSliderPos(parseInt(e.target.value))}
                          className="w-full accent-[#bfa77a]"
                          aria-label="Before/After Slider"
                        />
                        <div className="flex justify-between text-xs mt-1 text-[#6d4c1e]">
                          <span>Before</span>
                          <span>After</span>
                        </div>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bfa77a] mb-3"></div>
                        <div className="text-[#bfa77a]">Detecting face and applying foundation...</div>
                      </div>
                    )}
                    {/* Legacy buttons retained */}
                    <div className="mt-3 flex gap-2">
                      <button 
                        className="flex-1 text-xs py-1 px-2 rounded border border-[#bfa77a] text-[#bfa77a] hover:bg-[#bfa77a]/10 lux-cta-transition"
                        onClick={() => setProcessedImage(capturedImage)}
                      >
                        Show Before
                      </button>
                      <button 
                        className="flex-1 text-xs py-1 px-2 rounded border border-[#bfa77a] text-[#bfa77a] hover:bg-[#bfa77a]/10 lux-cta-transition"
                        onClick={() => applyFoundationWithBackend(capturedImage!, selectedShade.hex)}
                      >
                        Show After
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!capturedImage && experienceType === 'in-house' && (
              <div className="mt-4 w-full max-w-md mx-auto">
                <div className="lux-card rounded-xl p-3">
                  <div className="text-xs font-semibold text-[#6d4c1e] mb-2">In-home cartridge sets</div>
                  <div className="flex gap-2">
                    {inhouseCartridgeSets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => setSelectedInhouseSetId(set.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border lux-cta-transition ${
                          selectedInhouseSetId === set.id
                            ? 'border-[#bfa77a] bg-[#1c1a17] text-[#f7f2ea]'
                            : 'border-[#d9c6a4] bg-white/90 text-[#5b4632] hover:bg-white'
                        }`}
                      >
                        {set.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!capturedImage && (
              <>
                <CartridgeMarquee
                  mode="foundation"
                  targetHex={selectedShade.hex}
                  title={
                    isCartridgeSelectionMode
                      ? experienceType === 'store'
                        ? 'Cartridge Selection Formula'
                        : 'Your Cartridge Selection Formula'
                      : experienceType === 'store'
                        ? 'Cartridge Formula (Buy)'
                        : 'Your cartridge formula'
                  }
                  selectedShadeName={selectedShade.name}
                  cartridges={activeCartridges}
                  proposedShades={marqueeProposedShades}
                  highlightCartridgeIds={selectedShade.mix.map((mixItem) => mixItem.cartridgeId)}
                  mixBreakdown={selectedShade.mix.map((mixItem) => ({
                    cartridgeId: mixItem.cartridgeId,
                    percentage: mixItem.percentage,
                  }))}
                  onShadeSelect={(shade) => {
                    const found = foundationShades.find((item) => item.name === shade.name);
                    if (found) {
                      handleShadeSelect(found);
                    }
                  }}
                  scrollDurationSeconds={36}
                />
                <div className="text-[11px] text-[#6d4c1e]/75 mt-1 text-center px-3">
                  {isCartridgeSelectionMode
                    ? 'Selection source: this section shows the active 3-cartridge blend mapped to your selected shade.'
                    : 'Formula source: this section shows the physical 3-cartridge recipe for the selected shade.'}
                </div>
              </>
            )}

            {/* Shade preview section (hidden in store buy flow to avoid duplication with cartridge formula) */}
            {experienceType === 'in-house' && !isCartridgeSelectionMode && (
              <div className="mt-6 w-full max-w-md mx-auto flex flex-col items-center">
              {/* Single, centered label for swatch panel */}
              <div className="font-bold text-xl text-[#bfa77a] mb-3 text-center">
                {`${activeInhouseSet.label} shade gradients`}
              </div>
              <div className="text-xs text-[#6d4c1e] mb-2 text-center">
                {isCartridgeSelectionMode
                  ? 'These previews are generated from your selected cartridges with light-to-deep blend progression.'
                  : 'These shades are generated from your 3 cartridges with different light-to-dark mix ratios.'}
              </div>
              {/* Swatch panel: horizontal scroll if overflow */}
              <div className="w-full overflow-x-auto pb-2">
                <div className="flex flex-nowrap gap-3 px-1" style={{ minWidth: 0 }}>
                  <FoundationSwatchPanel
                    foundationSwatches={foundationShades}
                    selectedFoundation={selectedShade}
                    onSelect={handleShadeSelect}
                    isApplying={!!capturedImage && isProcessing}
                  />
                </div>
              </div>
              {/* Selected Shade Info */}
              <div className="lux-card rounded-xl px-6 py-4 text-center mt-4 w-full max-w-[400px] lux-smooth-panel" key={`selected-shade-${selectedShade.hex}`}>
                <div className="font-bold text-lg text-[#6d4c1e] mb-2">Selected Shade</div>
                <div className="flex items-center justify-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-[#bfa77a] shadow"
                    style={{ backgroundColor: selectedShade.color }}
                    title={selectedShade.name}
                  ></div>
                  <span className="font-semibold text-[#bfa77a]">{selectedShade.name}</span>
                </div>
                <div className="text-sm text-[#6d4c1e] mt-1">{selectedShade.hex}</div>
              </div>
              </div>
            )}
          </div>
          {/* Right Section - Recommended Foundation Details */}
          <div className="flex-1 flex flex-col items-center justify-start min-w-0">
            <div className="w-full max-w-md mx-auto mt-0 sticky top-10">
              <div className="lux-card rounded-xl px-6 py-4 lux-smooth-panel" key={`details-${selectedShade.hex}-${finish}-${lightingMode}`}>
                <div className="font-bold text-lg text-[#6d4c1e] mb-2">Recommended Foundation Details Section</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#6d4c1e]">Shade:</span>
                    <span className="font-bold text-[#bfa77a]">{selectedShade.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#6d4c1e]">Hex:</span>
                    <span className="font-bold text-[#bfa77a]">{selectedShade.hex}</span>
                  </div>
                  {selectedShade.mix.map((mixItem) => (
                    <div className="flex justify-between" key={mixItem.cartridgeId}>
                      <span className="font-semibold text-[#6d4c1e]">{cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId}:</span>
                      <span className="font-bold text-[#bfa77a]">{mixItem.percentage}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
                  <div className="font-bold text-sm text-[#6d4c1e] mb-2">Live Analysis Section</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Skin Index:</span>
                      <span className="font-bold text-[#bfa77a]">{skinIndexStory.label} <span className="text-[#6d4c1e]/70 font-medium">{skinIndexStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Highlight:</span>
                      <span className="font-bold text-[#bfa77a]">{highlightStory.label} <span className="text-[#6d4c1e]/70 font-medium">{highlightStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Confidence:</span>
                      <span className="font-bold text-[#bfa77a]">{confidenceStory.label} <span className="text-[#6d4c1e]/70 font-medium">{confidenceStory.subtle}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {alternativeShades.length > 0 && (
                <div className="lux-card rounded-xl px-6 py-4 mt-4">
                  <div className="font-bold text-base text-[#6d4c1e] mb-2">Closest Alternative Shades</div>
                  <div className="text-xs text-[#6d4c1e]/80 mb-3">
                    Quick switch options near your current match.
                  </div>
                  <div className="space-y-2">
                    {alternativeShades.map((candidate) => (
                      <button
                        key={candidate.shade.name}
                        type="button"
                        onClick={() => handleShadeSelect(candidate.shade)}
                        className="w-full flex items-center justify-between rounded-lg border border-[#d9c6a4] bg-white/90 px-3 py-2 text-left hover:bg-white lux-cta-transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-4 w-4 rounded-full border border-[#bfa77a]/70 shrink-0"
                            style={{ backgroundColor: candidate.shade.hex }}
                          />
                          <span className="text-sm font-semibold text-[#6d4c1e] truncate">
                            {candidate.shade.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#bfa77a] shrink-0">
                          {candidate.deltaLuma > 0
                            ? `Lighter +${candidate.deltaLuma}`
                            : `Darker ${candidate.deltaLuma}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="lux-card rounded-xl px-6 py-4 mt-4">
                <div className="font-bold text-base text-[#6d4c1e] mb-2">Luxury Checkout Bridge</div>
                <button
                  type="button"
                  onClick={handleReserveFormula}
                  className="main-action-btn w-full"
                  disabled={reservationLoading}
                >
                  {reservationLoading ? 'Reserving Formula...' : 'Reserve this Formula'}
                </button>
                {reservationMessage && (
                  <div className="mt-2 text-xs text-[#6d4c1e] bg-[#fdf6f0] border border-[#d9c6a4] rounded-lg px-3 py-2">
                    {reservationReference && (
                      <div className="font-semibold text-[#bfa77a] mb-1">Ref: {reservationReference}</div>
                    )}
                    {reservationMessage}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
                  <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Cartridge Replenishment</div>
                  <div className="space-y-1 text-xs text-[#6d4c1e]">
                    {replenishmentPlan.map((item) => (
                      <div key={item.cartridgeId} className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.cartridgeName} · {item.priority}</span>
                        <span className="font-semibold text-[#bfa77a] shrink-0">{item.etaDays} days</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
                  <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Expected Wear Profile</div>
                  <div className="space-y-1 text-xs text-[#6d4c1e]">
                    <div className="flex justify-between">
                      <span>Longevity</span>
                      <span className="font-semibold text-[#bfa77a]">{expectedWearProfile.longevity}</span>
                    </div>
                    <div>{expectedWearProfile.touchUpWindow}</div>
                    <div>{expectedWearProfile.bestSetting}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          className="main-action-btn mt-4"
          onClick={handleFullAnalysis}
        >
          Complexion Dossier
        </button>
        {/* Show full analysis modal/section */}
        {fullAnalysis && (
          <div className="mt-4 p-4 bg-white border border-[#bfa77a] rounded-xl shadow">
            {!fullAnalysisLoading && !fullAnalysis.error && (
              <>
                <div className="font-bold text-[#bfa77a] mb-3">Luxury Skin Analysis</div>
                {luxuryAnalysisView && (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-semibold text-[#6d4c1e]">Complexion Index:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.complexionIndex}%</span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Atelier Tier:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.tier}</span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Skin Tone Hex:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.toneHex}</span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Undertone:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.undertone}</span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Texture:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.textureScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.textureScore).subtle}</span></span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Evenness:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.evennessScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.evennessScore).subtle}</span></span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Hydration:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.hydrationScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.hydrationScore).subtle}</span></span></div>
                      <div><span className="font-semibold text-[#6d4c1e]">Pore Refinement:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.poreScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.poreScore).subtle}</span></span></div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg border border-[#d9c6a4] bg-[#fdf6f0]">
                      <div className="font-semibold text-[#6d4c1e] mb-1">Atelier Formula</div>
                      <div className="text-sm text-[#6d4c1e]">
                        {selectedShade.name} · {finish} finish · Confidence {luxuryAnalysisView.confidenceValue}%
                      </div>
                      <div className="text-xs text-[#6d4c1e]/80 mt-1">
                        {selectedShade.mix.map((mixItem) => `${cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId} ${mixItem.percentage}%`).join(' + ')}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="font-semibold text-[#6d4c1e] mb-1">Luxury Finish Direction</div>
                      <p className="text-sm text-[#6d4c1e]/90">{luxuryAnalysisView.finishingRecommendation}</p>
                      <p className="text-sm text-[#6d4c1e]/90 mt-1">{luxuryAnalysisView.refinementPriority}</p>
                    </div>

                    <div className="mt-4">
                      <div className="font-semibold text-[#6d4c1e] mb-1">Suggested Shades</div>
                      <div className="flex flex-wrap gap-2">
                        {(luxuryAnalysisView.suggestedShades || []).map((s: string) => (
                          <span key={s} className="px-3 py-1 rounded-full bg-[#f7e9f2] text-[#bfa77a] border border-[#bfa77a] text-xs font-semibold">{s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="font-semibold text-[#6d4c1e] mb-1">Concierge Notes</div>
                      <ul className="list-disc ml-5 text-[#bfa77a] text-sm space-y-1">
                        {(luxuryAnalysisView.conciergeTips.length > 0
                          ? luxuryAnalysisView.conciergeTips
                          : [
                              'Blend from center face outward for couture-level diffusion.',
                              'Set only high-movement zones to retain a natural luxury finish.',
                              'Layer in thin passes for camera-safe depth without heaviness.',
                            ]).map((tip: string) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </>
            )}
            {fullAnalysisLoading && (
              <div className="flex items-center gap-2 text-[#bfa77a]">
                <div className="w-5 h-5 border-2 border-[#bfa77a] border-t-transparent rounded-full animate-spin"></div>
                Preparing complexion dossier...
              </div>
            )}
            {fullAnalysis.error && (
              <div className="text-red-600 text-sm font-semibold">Error: {fullAnalysis.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoundationTryOnInterface;

/*
Features and How It Works:

1. Occasion Selector:
   - Dropdown at the top-left lets the user choose between "Everyday", "Party", and "Professional".
   - Changing the occasion updates the recommended foundation shades.

2. Camera Section:
   - Shows a live video feed from the user's camera.
   - User can capture a photo by clicking the "📸 Capture Photo" button (only visible after a shade is selected).
   - Captured image is sent to the backend to apply the selected foundation shade.

3. Foundation Swatch Panel:
   - Displayed below the camera feed.
   - Shows recommended foundation shades for the selected occasion.
   - User can select a shade; the selected shade is highlighted.
   - The swatch panel is labeled "Swatch Panel".

4. Processed Image Preview:
   - After capturing a photo, the processed image (with foundation applied) is shown below the camera.
   - Includes before/after comparison buttons.

5. Action Buttons:
   - After processing, if a face is detected, user can Save, Share, or Buy the look.

6. Recommended Foundation Details:
   - Panel below the camera section shows details for the selected shade: name, hex, mixing percentages, and live analysis data.

7. Error Handling:
   - Displays error messages if camera access fails or backend processing fails.

8. Modal Overlay:
   - The entire interface is rendered as a modal overlay, blocking the background.

9. No Lipstick Features:
   - No lipstick try-on or palette is present on this screen.

How it works:
- User selects an occasion, which updates the foundation shades.
- User selects a foundation shade from the swatch panel.
- User captures a photo; the image is sent to the backend for processing.
- The processed image is displayed, with options for before/after comparison and further actions.
- Recommended foundation details and live analysis are always visible below the camera/swatch panel.
*/

/*
Feature: Foundation Try-On (Hex Color Only)

Requirements for this feature to work:
- The backend server must be running and accessible at /v1/apply-foundation-mediapipe.
- The backend must support hex color codes for the foundation_color parameter (e.g., "#b08d57").
- MediaPipe FaceMesh must be available in the browser for landmark detection.
- User must grant camera access for live capture.
- The frontend and backend must use the same color format (hex) for foundation application.
- For neural/deep learning foundation (optional): Place a PyTorch model named foundation_style_model.pt in the backend directory.

How it works:
- User selects a foundation shade (hex code).
- User captures a photo.
- The selected hex color and image are sent to the backend for processing.
- The backend applies the foundation using the mask and returns the processed image.
- The frontend displays the processed image to the user.

Troubleshooting:
- If the color does not match, ensure only hex codes are used and backend logic does not convert to RGB.
- If the backend is not running or accessible, the feature will not work.
- If camera access is denied, the user cannot capture a photo.
*/
