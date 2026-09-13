import re

path = r"C:\Users\schmuck\.gemini\antigravity-cli\brain\a599a6d9-ec24-4ad3-97be-ffb476823a80\.system_generated\steps\96\content.md"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    text = f.read()

images = list(set(re.findall(r'https://static\.wikia\.nocookie\.net/wutheringwaves/images/[^\s"\'<>]+\.(?:png|webp|jpg)', text)))
print("Total unique images:", len(images))

target_chars = ['Jiyan', 'Yinlin', 'Jinhsi', 'Changli', 'Xiangli_Yao', 'Shorekeeper', 'Camellya', 'Carlotta', 'Roccia', 'Phoebe', 'Verina', 'Calcharo', 'Encore', 'Jianxin', 'Lingyang', 'Danjin', 'Chixia', 'Mortefi', 'Sanhua', 'Yangyang', 'Baizhi', 'Taoqi', 'Aalto', 'Yuanwu', 'Youhu', 'Lumi']

found = {}
for img in images:
    for char in target_chars:
        if char.lower() in img.lower():
            found.setdefault(char, []).append(img)

for char, urls in sorted(found.items()):
    print(f"=== {char} ({len(urls)} assets) ===")
    for u in sorted(urls):
        print("  ", u)
