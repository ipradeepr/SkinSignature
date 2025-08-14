import cv2

def get_camera_stream(camera_index=0):
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise IOError("Cannot open webcam")
    return cap
