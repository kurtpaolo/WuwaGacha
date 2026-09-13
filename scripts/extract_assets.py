import re

path = r"C:\Users\schmuck\.gemini\antigravity-cli\brain\a599a6d9-ec24-4ad3-97be-ffb476823a80\.system_generated\steps\96\content.md"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

print("File size:", len(text))
videos = re.findall(r'https://static\.wikia\.nocookie\.net/[^\s"\'<>]+\.(?:webm|mp4)', text)
print("Wikia videos found:", len(videos))
for v in list(set(videos))[:10]:
    print("VIDEO:", v)

images = re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:png|webp|jpg)', text)
print("Wikia images found:", len(images))
for img in list(set(images))[:10]:
    print("IMAGE:", img)
