// ============================================================================
// BIÑAN BAYAN (POBLACION) OVERWORLD MAP DATA & COLLISION ENGINE
// 100% Geographically Accurate 1:1 Metric OpenStreetMap GIS Pipeline
// Focused Historic Core Centered Exactly on Yangyang at Plaza Rizal
// Dimensions: 280 cols x 200 rows @ 30px/tile (8,400px x 6,000px)
// NO SECTIONING: Single Seamless Continuous Open World
// ============================================================================

import { PlazaNpc, PlazaPortal } from "./plazaTypes";
import binanExport from "./binanBayanExport.json";

export const BINAN_GRID_COLS = 280;
export const BINAN_GRID_ROWS = 200;
export const BINAN_TILE_SIZE = 30; // 30px per tile: 3m x 3m = original character size (30px)

export const BINAN_WORLD_WIDTH = BINAN_GRID_COLS * BINAN_TILE_SIZE;   // 8,400 px
export const BINAN_WORLD_HEIGHT = BINAN_GRID_ROWS * BINAN_TILE_SIZE; // 6,000 px

// Step size in percentage: exactly 1 tile (3m) per movement step
export const BINAN_STEP_X_PCT = (1 / BINAN_GRID_COLS) * 100; // ~0.35714%
export const BINAN_STEP_Y_PCT = (1 / BINAN_GRID_ROWS) * 100; // 0.50000%

// Tile Types
export enum BinanTileType {
  ROAD = 0,       // Walkable (Asphalt / Street / Alley)
  PLAZA = 1,      // Walkable (Plaza Rizal Courtyard / Bandstand Stone)
  SIDEWALK = 2,   // Walkable (Concrete Paver)
  BUILDING = 3,   // Houses, Shophouses, Church, Market Stalls
  WATER = 4,      // UNWALKABLE (Biñan River)
  GRASS = 5,      // Town Green / Courtyard Lawn
  BRIDGE = 6,     // Walkable (Tulay ng Biñan Stone Railing & Road)
}

// Landmark Information for HUD & Mini-map
export interface BinanLandmark {
  id: string;
  name: string;
  barangay: string;
  col: number;
  row: number;
  pctX: number;
  pctY: number;
  description: string;
}

// Convert tile coordinates to percentage (0 to 100)
export function tileToPercent(col: number, row: number): { x: number; y: number } {
  return {
    x: ((col + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((row + 0.5) / BINAN_GRID_ROWS) * 100,
  };
}

// Convert percentage (0 to 100) to tile coordinates
export function percentToTile(pctX: number, pctY: number): { col: number; row: number } {
  const col = Math.max(0, Math.min(BINAN_GRID_COLS - 1, Math.floor((pctX / 100) * BINAN_GRID_COLS)));
  const row = Math.max(0, Math.min(BINAN_GRID_ROWS - 1, Math.floor((pctY / 100) * BINAN_GRID_ROWS)));
  return { col, row };
}

// Real-world Landmark definitions in Biñan Bayan (Poblacion)
// Yangyang at Plaza Rizal is at the DEAD CENTER: col 140, row 100 (50%, 50%)
export const BINAN_LANDMARKS: BinanLandmark[] = [
  {
    id: "plaza_rizal",
    name: "Historic Plaza Rizal & Sentrong Pangkultura",
    barangay: "Brgy. Poblacion",
    col: 140,
    row: 100,
    pctX: ((140 + 0.5) / BINAN_GRID_COLS) * 100,
    pctY: ((100 + 0.5) / BINAN_GRID_ROWS) * 100,
    description: "The historic heart of Biñan, Rizal Monument & Old Municipal Hall (Dead Center)",
  },
  {
    id: "san_isidro_church",
    name: "San Isidro Labrador Parish Church",
    barangay: "Brgy. Poblacion",
    col: 152,
    row: 126,
    pctX: ((152 + 0.5) / BINAN_GRID_COLS) * 100,
    pctY: ((126 + 0.5) / BINAN_GRID_ROWS) * 100,
    description: "Historic 18th-century stone heritage parish church",
  },
  {
    id: "binan_public_market",
    name: "Pamilihang Bayan ng Biñan (Public Market)",
    barangay: "Brgy. Poblacion",
    col: 173,
    row: 141,
    pctX: ((173 + 0.5) / BINAN_GRID_COLS) * 100,
    pctY: ((141 + 0.5) / BINAN_GRID_ROWS) * 100,
    description: "Bustling central marketplace and home of famous Puto Biñan",
  },
  {
    id: "alberto_mansion",
    name: "Historic Alberto Mansion",
    barangay: "Brgy. Poblacion",
    col: 127,
    row: 115,
    pctX: ((127 + 0.5) / BINAN_GRID_COLS) * 100,
    pctY: ((115 + 0.5) / BINAN_GRID_ROWS) * 100,
    description: "Ancestral home of Teodora Alonso (Dr. José Rizal's mother)",
  },
  {
    id: "binan_bridge",
    name: "Tulay ng Biñan (Biñan Bridge)",
    barangay: "Brgy. Poblacion / Dela Paz",
    col: 205,
    row: 104,
    pctX: ((205 + 0.5) / BINAN_GRID_COLS) * 100,
    pctY: ((104 + 0.5) / BINAN_GRID_ROWS) * 100,
    description: "Historic bridge crossing the Biñan River connecting Poblacion with the eastern districts",
  },
];

// District Portals aligned to Biñan Bayan Landmarks
export const BINAN_PORTALS: PlazaPortal[] = [
  {
    id: "convene",
    name: "Convene Terminal",
    subtitle: "Plaza Rizal • Center",
    x: ((140 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((98 + 0.5) / BINAN_GRID_ROWS) * 100,
    radius: 5,
    color: "from-amber-500/25 via-yellow-500/15 to-transparent",
    accentColor: "border-yellow-400 text-yellow-300",
    icon: "Sparkles",
  },
  {
    id: "arena",
    name: "Combat Colosseum",
    subtitle: "Alberto Mansion • Sentrong Pangkultura",
    x: ((127 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((113 + 0.5) / BINAN_GRID_ROWS) * 100,
    radius: 5,
    color: "from-rose-500/25 via-red-500/15 to-transparent",
    accentColor: "border-rose-400 text-rose-300",
    icon: "Swords",
  },
  {
    id: "inventory",
    name: "Inventory",
    subtitle: "San Isidro Parish Church",
    x: ((152 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((124 + 0.5) / BINAN_GRID_ROWS) * 100,
    radius: 5,
    color: "from-purple-500/25 via-indigo-500/15 to-transparent",
    accentColor: "border-purple-400 text-purple-300",
    icon: "Briefcase",
  },
  {
    id: "tacet",
    name: "Free Astrites",
    subtitle: "Pamilihang Bayan ng Biñan",
    x: ((173 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((139 + 0.5) / BINAN_GRID_ROWS) * 100,
    radius: 5,
    color: "from-cyan-500/25 via-blue-500/15 to-transparent",
    accentColor: "border-cyan-400 text-cyan-300",
    icon: "Zap",
  },
];

// Interactive Resonator Guide NPCs stationed across the map
// Yangyang is stationed at the DEAD CENTER of the map (col 140, row 100)
export const BINAN_GUIDE_NPCS: PlazaNpc[] = [
  {
    // YANGYANG: DEAD CENTER at Plaza Rizal
    id: "npc_yangyang",
    name: "Yangyang",
    spriteId: "yangyang_xuanling",
    title: "Convene",
    service: "Convene Banners",
    x: ((140 + 0.5) / BINAN_GRID_COLS) * 100, // DEAD CENTER: col 140, row 100 (50%, 50%)
    y: ((100 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "right",
    greeting: "Hello, Rover! Would you like to check the Convene banners?",
    actions: [
      { label: "YES", actionId: "convene", variant: "primary" },
    ],
  },
  {
    // JIYAN: West Avenue / Entrance
    id: "npc_jiyan",
    name: "Jiyan",
    spriteId: "jiyan",
    title: "Arena",
    service: "Combat Arena",
    x: ((30 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((100 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "right",
    greeting: "Hello, Rover! Would you like to enter the Combat Arena?",
    actions: [
      { label: "YES", actionId: "arena", variant: "primary" },
    ],
  },
  {
    // CHANGLI: North Heritage District
    id: "npc_changli",
    name: "Changli",
    spriteId: "changli",
    title: "Inventory",
    service: "Inventory",
    x: ((215 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((30 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "left",
    greeting: "Hello, Rover! Would you like to open your Inventory?",
    actions: [
      { label: "YES", actionId: "inventory", variant: "primary" },
    ],
  },
  {
    // ZHEZHI: South-East Promenade
    id: "npc_zhezhi",
    name: "Zhezhi",
    spriteId: "zhezhi",
    title: "Free Astrites",
    service: "Free Astrites",
    x: ((245 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((150 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "left",
    greeting: "Hello, Rover! Would you like to collect your Free Astrites?",
    actions: [
      { label: "YES", actionId: "tacet", variant: "primary" },
    ],
  },
  {
    // BRANT: Coinflip - Double or Nothing (South-West Courtyard / Alberto Heritage Grounds)
    id: "npc_brant",
    name: "Brant",
    spriteId: "brant",
    title: "Coinflip",
    service: "Double or Nothing",
    x: ((75 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((145 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "right",
    greeting: "Heh, feeling lucky today Rover? Put your Astrites on the line. Heads or Tails — double or nothing!",
    actions: [
      { label: "PLAY COINFLIP", actionId: "minigame_coinflip", variant: "primary" },
    ],
  },
  {
    // CARLOTTA: Echo Slots - 3-Reel Retro Machine (North-East Riverside Promenade)
    id: "npc_carlotta",
    name: "Carlotta",
    spriteId: "carlotta",
    title: "Echo Slots",
    service: "Retro 3-Reel Slots",
    x: ((205 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((70 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "left",
    greeting: "Step right up, Rover! Pull the lever on the Echo Slot machine — hit 3 of a kind or the 100x Gold Star Jackpot!",
    actions: [
      { label: "PLAY SLOTS", actionId: "minigame_slots", variant: "primary" },
    ],
  },
  {
    // YINLIN: Tacet Blackjack 21 - North-West Heritage Pavilion
    id: "npc_yinlin",
    name: "Yinlin",
    spriteId: "yinlin",
    title: "Blackjack 21",
    service: "Tacet Blackjack",
    x: ((70 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((55 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "right",
    greeting: "Let's see if your nerve holds under pressure. Standard 21 — Hit, Stand, or Double Down against the house.",
    actions: [
      { label: "PLAY BLACKJACK", actionId: "minigame_blackjack", variant: "primary" },
    ],
  },
  {
    // CANTARELLA: European Roulette - Far North Terrace Overlook
    id: "npc_cantarella",
    name: "Cantarella",
    spriteId: "cantarella",
    title: "Roulette",
    service: "European Roulette",
    x: ((140 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((35 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "left",
    greeting: "Step up to the wheel, Rover! Place your bets on Red, Black, Dozens, or test fate on a lucky number for 36x!",
    actions: [
      { label: "PLAY ROULETTE", actionId: "minigame_roulette", variant: "primary" },
    ],
  },
  {
    // PHOEBE: Philippine Color Game (Far South Esplanade)
    id: "npc_phoebe",
    name: "Phoebe",
    spriteId: "phoebe",
    title: "Color Game",
    service: "2-Dice Color Game",
    x: ((140 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((170 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "right",
    greeting: "Roll the 2 color dice! Match 1 color for 3.0x, or hit both for a 4.2x double win!",
    actions: [
      { label: "PLAY COLOR GAME", actionId: "minigame_wheel", variant: "primary" },
    ],
  },
  {
    // LUPA: Mystery Scratchcards (Far East Bazaar Arcade)
    id: "npc_lupa",
    name: "Lupa",
    spriteId: "lupa",
    title: "Scratchcards",
    service: "5x5 Scratchcards",
    x: ((235 + 0.5) / BINAN_GRID_COLS) * 100,
    y: ((110 + 0.5) / BINAN_GRID_ROWS) * 100,
    facing: "left",
    greeting: "Grab a 5×5 scratchcard, Rover! Match 3 of the same prize tier to win up to 20x!",
    actions: [
      { label: "SCRATCH CARDS", actionId: "minigame_scratch", variant: "primary" },
    ],
  },
];

// Default spawn location: Red box area at San Isidro courtyard (col 151, row 125)
export const DEFAULT_SPAWN_PCT = {
  x: ((151 + 0.5) / BINAN_GRID_COLS) * 100,
  y: ((125 + 0.5) / BINAN_GRID_ROWS) * 100,
};

// ============================================================================
// CLEAN GIS TILEMAP DATA & COLLISION ENGINE
// ============================================================================

export interface BinanMapData {
  tiles: Uint8Array;       // Type per tile (BinanTileType)
  collision: Uint8Array;   // 1 = Walkable (Roads, Sidewalks, Plazas, Land), 0 = Blocked (Water)
}

let cachedMapData: BinanMapData | null = null;

export function getBinanMapData(): BinanMapData {
  if (cachedMapData) return cachedMapData;

  const totalTiles = BINAN_GRID_COLS * BINAN_GRID_ROWS;
  const tiles = new Uint8Array(binanExport.tiles || totalTiles);
  const collision = new Uint8Array(binanExport.collision || totalTiles);

  cachedMapData = { tiles, collision };
  return cachedMapData;
}

export function isTileWalkable(col: number, row: number): boolean {
  if (col < 0 || col >= BINAN_GRID_COLS || row < 0 || row >= BINAN_GRID_ROWS) {
    return false;
  }
  const { collision, tiles } = getBinanMapData();
  const index = row * BINAN_GRID_COLS + col;
  // Walkable if collision flag is 1 or tile is water (Biñan River is walkable/swimmable)
  return collision[index] === 1 || tiles[index] === BinanTileType.WATER;
}

export function isTileWater(col: number, row: number): boolean {
  if (col < 0 || col >= BINAN_GRID_COLS || row < 0 || row >= BINAN_GRID_ROWS) {
    return false;
  }
  const { tiles } = getBinanMapData();
  const index = row * BINAN_GRID_COLS + col;
  return tiles[index] === BinanTileType.WATER;
}

export function isWaterPercent(pctX: number, pctY: number): boolean {
  const { col, row } = percentToTile(pctX, pctY);
  return isTileWater(col, row);
}

export function isRoadWalkablePercent(pctX: number, pctY: number): boolean {
  const { col, row } = percentToTile(pctX, pctY);
  return isTileWalkable(col, row);
}

export function getNearestLandmark(pctX: number, pctY: number): BinanLandmark {
  let nearest = BINAN_LANDMARKS[0];
  let minDistance = Infinity;

  for (const landmark of BINAN_LANDMARKS) {
    const dx = landmark.pctX - pctX;
    const dy = landmark.pctY - pctY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = landmark;
    }
  }

  return nearest;
}

export function getNearestWalkablePercent(pctX: number, pctY: number): { x: number; y: number } {
  if (isRoadWalkablePercent(pctX, pctY)) {
    return { x: pctX, y: pctY };
  }

  const { col, row } = percentToTile(pctX, pctY);
  // Breadth-first search for closest walkable tile
  for (let r = 1; r <= 30; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nc = col + dx;
        const nr = row + dy;
        if (isTileWalkable(nc, nr)) {
          return tileToPercent(nc, nr);
        }
      }
    }
  }

  return DEFAULT_SPAWN_PCT;
}
