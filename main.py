import cv2
from camera import get_camera_stream
from face_detection import detect_faces
from feature_extraction import get_face_features
from geo_location import get_geolocation


cap = get_camera_stream()
loc, loc_str = get_geolocation()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    faces = detect_faces(frame)

    for (x, y, w, h) in faces:
        # Ignore very small or partial faces
        if w < 40 or h < 40:
            continue
        # Draw bounding box
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        label = f"Face: {w}x{h}"
        cv2.putText(frame, label, (x, y - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

        # Get face features
        features = get_face_features(frame, x, y, w, h)
        if features:
            # Compact, single-line display for clarity
            display_text = (
                f"{features['skin_tone']} | "
                f"B:{features['brightness']:.0f} "
                f"C:{features['contrast']:.0f} "
                f"A:{features['area']} "
                f"BGR:{features['avg_bgr']}"
            )
            cv2.putText(frame, display_text, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    # Show geo-location on screen
    cv2.putText(frame, f"Location: {loc_str}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 128, 255), 2)

    cv2.imshow("Face & Skin Tone Detection", frame)

    if cv2.waitKey(1) & 0xFF == 27:  # ESC to exit
        break

cap.release()
cv2.destroyAllWindows()
