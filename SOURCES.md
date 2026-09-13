# Wuthering Waves (WuWa) Convene Simulator - Asset & Reference Sources

This reference document catalogs the exact asset repositories, audio stems, video animation sources, and mathematical specifications used in this 1:1 replica of the Wuthering Waves Convene system.

---

## 1. Visual Layout & Code Architecture Reference
- **Simulator Reference**: [https://wuwa.aza.gg/gacha](https://wuwa.aza.gg/gacha)
  - DOM structure reference for layering: Canvas background atmosphere -> Active Banner Stage (Back/Esc button, dynamic Convene title, Currency HUD) -> Center stage hero illustration -> Rate-up 4-stars -> Details/History glassmorphic controls -> Dual Convene pill buttons.
  - Video cutscene overlay architecture: Seamless full-screen video player container with skip control at `top: 1.5rem, right: 2rem`, onended triggers, and step-through individual card reveal before 10-item summary grid.
- **WuWa Gacha Math Trackers**: [https://github.com/dyar7474/WuWa_local_tracker](https://github.com/dyar7474/WuWa_local_tracker)
  - Mathematical formulas for Kuro Games Convene rules:
    - 5-Star base: 0.8% (0.008)
    - 5-Star soft pity: Starts at pull 66, ramps by +4.0% per pull up to 100% at hard pity 80.
    - 50/50 mechanic: 50% chance for featured limited resonator, 50% for standard 5-star resonator (Verina, Calcharo, Encore, Jianxin, Lingyang). Losing 50/50 guarantees the next 5-star.
    - 4-Star base: 6.0% (0.06), hard pity at pull 10. Featured 4-stars have a 50% rate-up guarantee.
    - Currency rebates: 15 Afterglow Corals per duplicate 5-star, 3 Afterglow Corals per duplicate 4-star, 15 Oscillated Corals per 3-star weapon.

---

## 2. Original Summon Cutscenes & Video Assets (3★ / 4★ / 5★)
- **Direct Cutscene Video Archive**: [https://github.com/SunsetMkt/WuWa-Cutscenes](https://github.com/SunsetMkt/WuWa-Cutscenes)
- **Convene Animation Videos**: [https://wutheringwaves.fandom.com/wiki/Convene/Gallery](https://wutheringwaves.fandom.com/wiki/Convene/Gallery)
- **Aza Simulator Video Assets**:
  - `gacha_gold_5star.webm` / `Convene_Gold_5Star.webm`: High-energy golden explosion with particle data burst.
  - `gacha_purple_4star.webm` / `Convene_Purple_4Star.webm`: Purple streak surge vortex.
  - `gacha_blue_3star.webm` / `Convene_Blue_3Star.webm`: Blue energy vortex / meteor.
  - Character Convene Intro Splash Videos / Animated Loops: Transparent animated resonator introductions (e.g., Changli, Jinhsi, Zhezhi, Carlotta) and cutout cards with voice stingers.

---

## 3. Character Portraits, Banners & Icons (1.0 to 3.7)
- **High-Res Assets Mirror**: [https://github.com/ryanbenson/wuthering-waves-assets](https://github.com/ryanbenson/wuthering-waves-assets)
  - Resonator character portrait renders (1.0 – 3.7).
  - Element emblems: Spectro, Havoc, Glacio, Fusion, Electro, Aero.
  - Weapon type icons: Sword, Broadblade, Pistols, Gauntlets, Rectifier.
  - 5-Star signature weapons and 4-star/3-star weapon renders.
- **Nanoka Asset CDN**: `https://static.nanoka.cc/assets/ww/UIResources/Common/Image/IconRolePile/`
- **Game API / Character Endpoints**:
  - `https://api.hakush.in/ww/data/character.json`
  - `https://api.hakush.in/ww/data/weapon.json`

---

## 4. Audio Stems (Zero UI Noise Requirement)
Per explicit specification:
- **NO UI HOVER OR CLICK SOUNDS**: Synthetic beeps, clicks, and generic modal sounds are completely omitted.
- **Convene Audio Only**:
  - Embedded meteor launch sequence audio from the official webm cutscenes.
  - 3-Star Blue Reveal Stinger: Crisp crystalline celestial chord chime.
  - 4-Star Purple Reveal Stinger: Deep resonant mystic dual-tone chord stinger.
  - 5-Star Gold Reveal Stinger: Grand triumphant orchestral / synth fanfare.
  - Resonator Voice Lines: Character intro resonance voice lines on 5-star reveal cards.
