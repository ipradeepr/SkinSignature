import cv2
import numpy as np

# DNN model files (download if not present)
MODEL_PROTO = "models/deploy.prototxt"
MODEL_WEIGHTS = "models/res10_300x300_ssd_iter_140000.caffemodel"

class DNNFaceDetector:
    def __init__(self):
        self.net = cv2.dnn.readNetFromCaffe(MODEL_PROTO, MODEL_WEIGHTS)

    def detect_faces(self, frame, conf_threshold=0.6):
        h, w = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300), (104.0, 177.0, 123.0))
        self.net.setInput(blob)
        detections = self.net.forward()
        faces = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > conf_threshold:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                x1, y1, x2, y2 = box.astype(int)
                faces.append((x1, y1, x2 - x1, y2 - y1, confidence))
        return faces
