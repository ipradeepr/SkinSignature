def get_geolocation():
    g = geocoder.ip('me')
    if g.ok:
        return f"Location: {g.city}, {g.country}"
    return "Location: Unknown"
import cv2
import geocoder

# Load Haar Cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def detect_faces(frame, window_width=None, window_height=None, show_location=True):
    # Only resize if explicit window size is provided
    if window_width is not None and window_height is not None:
        frame = cv2.resize(frame, (window_width, window_height))

    # Static variables for tracker
    if not hasattr(detect_faces, "tracker"):
        detect_faces.tracker = None
        detect_faces.tracking = False
        detect_faces.track_confidence = 0.0

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    h, w = gray.shape
    min_size = (max(30, w // 20), max(30, h // 20))
    max_size = (w // 2, h // 2)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=6,
        minSize=min_size,
        maxSize=max_size
    )
    filtered_faces = []
    for (x, y, fw, fh) in faces:
        if min_size[0] <= fw <= max_size[0] and min_size[1] <= fh <= max_size[1]:
            filtered_faces.append((x, y, fw, fh))

    # Face tracking logic
    if not detect_faces.tracking or len(filtered_faces) == 0:
        # Start tracking the largest face
        if len(filtered_faces) > 0:
            largest = max(filtered_faces, key=lambda f: f[2]*f[3])
            detect_faces.tracker = cv2.TrackerCSRT_create()
            detect_faces.tracker.init(frame, tuple(largest))
            detect_faces.tracking = True
            detect_faces.track_confidence = 1.0
    else:
        # Update tracker
        ok, bbox = detect_faces.tracker.update(frame)
        if ok:
            x, y, fw, fh = [int(v) for v in bbox]
            cv2.rectangle(frame, (x, y), (x + fw, y + fh), (255, 0, 0), 2)
            detect_faces.track_confidence = 0.9
            filtered_faces = [(x, y, fw, fh)]
        else:
            detect_faces.tracking = False
            detect_faces.track_confidence = 0.0

    # Draw detected faces (green) and tracked face (blue)
    for (x, y, fw, fh) in filtered_faces:
        cv2.rectangle(frame, (x, y), (x + fw, y + fh), (0, 255, 0), 2)
        cv2.putText(frame, f"Confidence: {detect_faces.track_confidence:.2f}", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2)

    # Display geo-location on frame
    if show_location:
        h = frame.shape[0]
        location_text = get_geolocation()
        cv2.putText(frame, location_text, (10, h-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

    return faces, frame
