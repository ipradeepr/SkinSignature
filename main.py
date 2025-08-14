import cv2
from camera import get_camera_stream
from face_detection import detect_faces
from feature_extraction import get_skin_tone
from foundation_palette import show_foundation_palette

cap = get_camera_stream()

palette_shown = False

while True:
    ret, frame = cap.read()
    if not ret:
        break

    faces, frame = detect_faces(frame)

    for (x, y, w, h) in faces:
        # Get skin tone
        tone = get_skin_tone(frame, x, y, w, h)
        if tone:
            if isinstance(tone, dict):
                tone_str = f"{tone['tone']} ({tone['undertone']})"
                base_lab = tone['avg_lab']
            else:
                tone_str = str(tone)
                base_lab = None
            cv2.putText(frame, f"Skin Tone: {tone_str}", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            # Show foundation palette for first detected face only
            if not palette_shown and base_lab:
                selected_shade = show_foundation_palette(base_lab)
                print(f"Selected foundation shade: {selected_shade}")
                palette_shown = True

    cv2.imshow("Face & Skin Tone Detection", frame)

    if cv2.waitKey(1) & 0xFF == 27:  # ESC to exit
        break

cap.release()
cv2.destroyAllWindows()
