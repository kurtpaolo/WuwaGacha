import re

path = r"C:\Users\schmuck\.gemini\antigravity-cli\brain\a2e71cae-4214-4fd8-a597-311d0b4b152c\.system_generated\steps\299\content.md"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

# Look for image urls
links = list(set(re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:png|webp|jpg)', text)))
print("Total unique images in Resonator/Gallery:", len(links))

splash_links = {}
for l in links:
    if "splash" in l.lower():
        # extract filename
        clean_url = l.split("/revision/")[0]
        filename = clean_url.split("/")[-1]
        splash_links[filename] = l

print(f"\nFound {len(splash_links)} splash art images:")
for fn, url in sorted(splash_links.items()):
    print(f"  {fn} -> {url}")
