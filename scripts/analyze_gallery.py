import re

path = r"C:\Users\schmuck\.gemini\antigravity-cli\brain\a2e71cae-4214-4fd8-a597-311d0b4b152c\.system_generated\steps\138\content.md"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Look for media links
links = re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:webm|mp4|png|webp|gif)', text)
print("Total wikia links:", len(links))

# Unique filenames
filenames = set()
for l in links:
    m = re.search(r'/([^/]+\.(?:webm|mp4|png|webp|gif))', l)
    if m:
        filenames.add(m.group(1))

print("Unique filenames:", len(filenames))
for f in sorted(filenames):
    if any(k in f.lower() for k in ['convene', 'draw', 'still', 'cutout', 'star', 'splash', 'video', 'gacha', 'blue', 'gold', 'purple']):
        print(" ", f)
