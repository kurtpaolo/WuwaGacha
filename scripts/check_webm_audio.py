# Check if the webm files have audio
with open("public/assets/videos/gacha_gold_5star.webm", "rb") as f:
    data = f.read(50000)
    print("Contains Vorbis/Opus:", b"Opus" in data or b"vorbis" in data or b"Audio" in data)

with open("public/assets/videos/gacha_purple_4star.webm", "rb") as f:
    data = f.read(50000)
    print("Contains Vorbis/Opus:", b"Opus" in data or b"vorbis" in data or b"Audio" in data)
