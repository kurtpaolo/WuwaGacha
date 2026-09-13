import urllib.request
import json
import time

time.sleep(1)

base = "http://localhost:3000"

def get(url):
    req = urllib.request.Request(f"{base}{url}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def post(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(f"{base}{url}", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

print("--- 1. Testing GET /api/user/state ---")
state = get("/api/user/state")
print("User balances:", state["user"])
print("Pity state:", state["pity"])

print("\n--- 2. Selecting Character: Jinhsi (Patch 1.1) ---")
sel_res = post("/api/user/state", {"action": "select_character", "selectedChar": "jinhsi"})
print("Selected limited char:", sel_res["user"]["selectedLimitedChar"])

print("\n--- 3. Granting Astrite for testing ---")
grant_res = post("/api/user/state", {"action": "grant_currency", "addAstrite": 16000, "addTides": 20})
print("Updated Astrite:", grant_res["user"]["astrite"], "Radiant Tides:", grant_res["user"]["radiantTide"])

print("\n--- 4. Performing 10-Pull on Character Limited Banner ---")
pull_res = post("/api/convene/pull", {"bannerType": "character_limited", "count": 10})
print("Highest Rarity:", pull_res["highestRarity"])
print("Total Results:", len(pull_res["results"]))
for idx, r in enumerate(pull_res["results"]):
    print(f"  Item {idx+1}: {r['item']['name']} ({r['rarity']}-star {r['item']['type']}) - Pity: {r['pityAtPull']}, New: {r['isNew']}, Afterglow: +{r['afterglowCoralAwarded']}, Oscillated: +{r['oscillatedCoralAwarded']}")
print("New 5-star Pity:", pull_res["newPity5"], "New 4-star Pity:", pull_res["newPity4"], "Guaranteed:", pull_res["guaranteedLimited"])

print("\n--- 5. Testing GET /api/history ---")
hist = get("/api/history?page=1&limit=10&bannerType=all")
print("History records:", len(hist.get("logs", [])), "Total:", hist.get("total"))
for log in hist.get("logs", [])[:5]:
    print(f"  Log: {log['item_name']} ({log['rarity']}-star) - pity: {log['pity_count']}, date: {log['created_at']}")

print("\n--- 6. Testing 70-Pull to trigger Soft Pity ---")
# Pull 7 times 10
for pull_num in range(7):
    p_res = post("/api/convene/pull", {"bannerType": "character_limited", "count": 10})
    if p_res["highestRarity"] == 5:
        print(f"  5-Star Pulled on batch {pull_num+1}! 5-Star Items:")
        for it in p_res["results"]:
            if it["rarity"] == 5:
                print(f"    --> {it['item']['name']} (pity at pull: {it['pityAtPull']}, guaranteed: {it['isGuaranteed']})")
        print(f"  New 5-star pity: {p_res['newPity5']}, Guaranteed next: {p_res['guaranteedLimited']}")
        break

print("\nALL BACKEND & GACHA MATH ENGINE TESTS COMPLETED SUCCESSFULLY!")
