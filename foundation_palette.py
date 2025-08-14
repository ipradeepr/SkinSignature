import cv2
import numpy as np

def show_foundation_palette(base_lab, window_name="Foundation Palette", width=500, height=80, n_shades=10):
    print(f"Opening palette window: {window_name}")
    """
    Display a horizontal palette window for foundation selection.
    Lighter shades on the left, darker on the right.
    base_lab: dict with keys 'L', 'A', 'B' (from skin tone analysis)
    Returns selected shade LAB and BGR value.
    """
    L_base = base_lab['L']
    A_base = base_lab['A']
    B_base = base_lab['B']
    L_values = np.linspace(min(255, L_base+40), max(0, L_base-40), n_shades)
    palette = np.zeros((height, width, 3), dtype=np.uint8)
    shade_width = width // n_shades
    bgr_shades = []
    lab_shades = []
    for i, L in enumerate(L_values):
        lab_color = np.full((height, shade_width, 3), [L, A_base, B_base], dtype=np.uint8)
        bgr_color = cv2.cvtColor(lab_color, cv2.COLOR_LAB2BGR)
        palette[:, i*shade_width:(i+1)*shade_width] = bgr_color
        bgr_shades.append(bgr_color[0,0].tolist())
        lab_shades.append([float(L), float(A_base), float(B_base)])

    selected_idx = [None]

    def on_mouse(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            idx = x // shade_width
            if 0 <= idx < n_shades:
                selected_idx[0] = idx

    cv2.namedWindow(window_name)
    cv2.setMouseCallback(window_name, on_mouse)
    while True:
        display_palette = palette.copy()
        if selected_idx[0] is not None:
            # Highlight selected shade
            x0 = selected_idx[0] * shade_width
            x1 = x0 + shade_width
            cv2.rectangle(display_palette, (x0,0), (x1-1,height-1), (0,255,0), 2)
        cv2.imshow(window_name, display_palette)
        key = cv2.waitKey(1)
        if key == 27 or selected_idx[0] is not None:  # ESC or selection
            break
    cv2.destroyWindow(window_name)
    print(f"Palette window closed: {window_name}")
    if selected_idx[0] is not None:
        return {
            "lab": lab_shades[selected_idx[0]],
            "bgr": bgr_shades[selected_idx[0]],
            "index": selected_idx[0]
        }
    else:
        return None

# Example usage:
# base_lab = {'L': 150, 'A': 135, 'B': 140}
# show_foundation_palette(base_lab)
