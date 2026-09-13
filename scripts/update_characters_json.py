import json
import os

with open("characters.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# If suoming_splash.png doesn't exist, create copy from portrait
if not os.path.exists("public/assets/characters/suoming_splash.png"):
    import shutil
    shutil.copy("public/assets/characters/suoming_portrait.png", "public/assets/characters/suoming_splash.png")

for r in data["limitedResonators"]:
    splash_file = f"public/assets/characters/{r['id']}_splash.png"
    if os.path.exists(splash_file):
        r["splashUrl"] = f"/assets/characters/{r['id']}_splash.png"
        print(f"Set splash for limited: {r['id']} -> {r['splashUrl']}")
    else:
        print(f"Warning: {splash_file} not found for {r['id']}, using portrait")
        r["splashUrl"] = r.get("portraitUrl")

for r in data["standard5StarResonators"]:
    splash_file = f"public/assets/characters/{r['id']}_splash.png"
    if os.path.exists(splash_file):
        r["splashUrl"] = f"/assets/characters/{r['id']}_splash.png"
        print(f"Set splash for standard: {r['id']} -> {r['splashUrl']}")

with open("characters.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Updated characters.json successfully.")
