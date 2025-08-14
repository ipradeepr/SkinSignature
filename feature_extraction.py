import cv2
import numpy as np

def get_skin_tone(frame, x, y, w, h):
    face_roi = frame[y:y+h, x:x+w]

    if face_roi.size == 0:
        return None

    # Convert to LAB color space for better brightness separation
    lab = cv2.cvtColor(face_roi, cv2.COLOR_BGR2LAB)
    avg_lab = np.mean(lab.reshape(-1, 3), axis=0)  # Mean LAB color

    L, A, B = avg_lab
    # More nuanced skin tone categories
    if L > 200:
        tone = "Very Fair"
    elif L > 180:
        tone = "Fair"
    elif L > 150:
        tone = "Light"
    elif L > 120:
        tone = "Medium"
    elif L > 90:
        tone = "Olive"
    elif L > 65:
        tone = "Tan"
    else:
        tone = "Deep"

    # Refined undertone detection using A and B channels
    if A > 140 and B < 130:
        undertone = "Cool Pink"
    elif A < 130 and B > 140:
        undertone = "Warm Yellow"
    elif 130 <= A <= 140 and 130 <= B <= 140:
        undertone = "Neutral"
    elif A > 140 and B > 140:
        undertone = "Warm Peach"
    elif A < 130 and B < 130:
        undertone = "Cool Olive"
    else:
        undertone = "Uncertain"

    # Edge case: very low or high values
    if L < 30 or L > 240:
        confidence = "Low confidence"
    else:
        confidence = "High confidence"

    # Optionally, add more features (e.g., brightness variance)
    brightness_var = np.var(lab[:,:,0]) if lab.ndim == 3 else 0

    # Return a structured result
    return {
        "tone": tone,
        "undertone": undertone,
        "confidence": confidence,
        "avg_lab": {
            "L": float(L),
            "A": float(A),
            "B": float(B)
        },
        "brightness_variance": float(brightness_var)
    }
