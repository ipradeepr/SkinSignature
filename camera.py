import cv2


def get_camera_stream():
    """
    Try to open the first available camera (indices 0-3).
    Returns the VideoCapture object or raises an error with details.
    """
    for idx in range(4):
        cap = cv2.VideoCapture(idx)
        if cap.isOpened():
            print(f"Camera opened at index {idx}")
            return cap
        cap.release()
    raise IOError("Cannot open any webcam. Please check connection, drivers, or camera usage.")
