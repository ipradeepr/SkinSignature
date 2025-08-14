import requests

urls = [
    "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000_fp16.caffemodel",
    "https://github.com/opencv/opencv/releases/download/4.5.2/res10_300x300_ssd_iter_140000_fp16.caffemodel"
]
output_path = r"c:\SkinSignatureNew\SkinSignature\models\res10_300x300_ssd_iter_140000_fp16.caffemodel"

for url in urls:
    print(f"Attempting to download model file from {url} ...")
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Download complete: {output_path}")
        break
    else:
        print(f"Failed to download file from {url}. Status code: {response.status_code}")
else:
    print("All download attempts failed. Please check the URLs or download the file manually from the official OpenCV releases page.")
