import re

path = r"C:\Users\schmuck\.gemini\antigravity-cli\brain\a2e71cae-4214-4fd8-a597-311d0b4b152c\.system_generated\steps\299\content.md"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

links = list(set(re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:png|webp|jpg)', text)))
print("All unique image URLs:")
for l in sorted(links):
    clean_url = l.split("/revision/")[0]
    filename = clean_url.split("/")[-1]
    print(" ", filename, "->", clean_url)
