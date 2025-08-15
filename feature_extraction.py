import cv2
import numpy as np


def get_face_features(frame, x, y, w, h):
    """
    Extracts skin tone, average color, brightness, contrast, and face area from the detected face region.
    Returns a dictionary of features.
    """
    face_roi = frame[y:y+h, x:x+w]
    if face_roi.size == 0:
        return None

    # Skin tone (LAB color space)
    lab = cv2.cvtColor(face_roi, cv2.COLOR_BGR2LAB)
    avg_lab = np.mean(lab, axis=(0, 1))
    L, A, B = avg_lab
    # Refined, generic, universally recognized skin tone descriptors using L, A, B
    if L > 220 and A < 130 and B < 130:
        skin_tone = "Alabaster"
    elif L > 210 and A < 135 and B < 135:
        skin_tone = "Porcelain"
    elif L > 200 and A < 140 and B < 140:
        skin_tone = "Shell"
    elif L > 190 and A < 145 and B < 145:
        skin_tone = "Ivory"
    elif L > 180 and A < 150 and B < 150:
        skin_tone = "Sand"
    elif L > 170 and A < 155 and B < 155:
        skin_tone = "Beige"
    elif L > 155 and A < 160 and B < 160:
        skin_tone = "Buff"
    elif L > 140 and A < 165 and B < 165:
        skin_tone = "Honey"
    elif L > 125 and A < 170 and B < 170:
        skin_tone = "Golden"
    elif L > 110 and A < 175 and B < 175:
        skin_tone = "Caramel"
    elif L > 95 and A < 180 and B < 180:
        skin_tone = "Chestnut"
    elif L > 80 and A < 185 and B < 185:
        skin_tone = "Mocha"
    else:
        skin_tone = "Espresso"

    # Average BGR color
    avg_bgr = np.mean(face_roi, axis=(0, 1))
    avg_bgr = tuple(int(c) for c in avg_bgr)

    # Brightness (mean of grayscale)
    gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))

    # Contrast (std of grayscale)
    contrast = float(np.std(gray))

    # Face area
    area = w * h

    return {
        "skin_tone": skin_tone,
        "avg_lab": tuple(avg_lab),
        "avg_bgr": avg_bgr,
        "brightness": brightness,
        "contrast": contrast,
        "area": area
    }
