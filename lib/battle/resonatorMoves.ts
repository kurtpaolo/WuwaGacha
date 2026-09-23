import { BattleMove, BattleResonator, ResonatorElement, StatusEffectType, TargetScope } from "./types";
import charactersData from "@/characters.json";

export const SPRITE_MAP: Record<string, string> = {
  shorekeeper: "/assets/sprites/shorekeeper_transparent.png",
  jiyan: "/assets/sprites/jiyan_transparent.png",
  yinlin: "/assets/sprites/yinlin_transparent.png",
  jinhsi: "/assets/sprites/jinhsi_transparent.png",
  changli: "/assets/sprites/changli_transparent.png",
  zhezhi: "/assets/sprites/zhezhi_transparent.png",
  xiangli_yao: "/assets/sprites/xiangli_yao_transparent.png",
  camellya: "/assets/sprites/camellya_transparent.png",
  carlotta: "/assets/sprites/carlotta_transparent.png",
  roccia: "/assets/sprites/roccia_transparent.png",
  phoebe: "/assets/sprites/phoebe_transparent.png",
  brant: "/assets/sprites/brant_transparent.png",
  cantarella: "/assets/sprites/cantarella_transparent.png",
  ciaccona: "/assets/sprites/ciaccona_transparent.png",
  zani: "/assets/sprites/zani_transparent.png",
  cartethyia: "/assets/sprites/cartethyia_transparent.png",
  lupa: "/assets/sprites/lupa_transparent.png",
  phrolova: "/assets/sprites/phrolova_transparent.png",
  augusta: "/assets/sprites/augusta_transparent.png",
  iuno: "/assets/sprites/iuno_transparent.png",
  qiuyuan: "/assets/sprites/qiuyuan_transparent.png",
  chisa: "/assets/sprites/chisa_transparent.png",
  lynae: "/assets/sprites/lynae_transparent.png",
  mornye: "/assets/sprites/mornye_transparent.png",
  luuk_herssen: "/assets/sprites/luuk_herssen_transparent.png",
  aemeath: "/assets/sprites/aemeath_transparent.png",
  sigrika: "/assets/sprites/sigrika_transparent.png",
  denia: "/assets/sprites/denia_transparent.png",
  hiyuki: "/assets/sprites/hiyuki_transparent.png",
  lucilla: "/assets/sprites/lucilla_transparent.png",
  lucy: "/assets/sprites/lucy_transparent.png",
  rebecca: "/assets/sprites/rebecca_transparent.png",
  suisui: "/assets/sprites/suisui_transparent.png",
  yangyang_xuanling: "/assets/sprites/yangyang_xuanling_transparent.png",
  qingxiao: "/assets/sprites/qingxiao_transparent.png",
  jingran: "/assets/sprites/jingran_transparent.png",
  suoming: "/assets/sprites/suoming_transparent.png",
};

interface MoveTemplate {
  basic: string;
  skill: string;
  forte: string;
  liberation: string;
}

const CUSTOM_MOVES: Record<string, MoveTemplate> = {
  jinhsi: {
    basic: "Slash of Jinzhou",
    skill: "Trailing Lights",
    forte: "Incarnation: Solar Flare",
    liberation: "Purge of Light",
  },
  changli: {
    basic: "Blazing True Sight",
    skill: "Tripartite Flames",
    forte: "Flaming Feather",
    liberation: "Radiance of Feathers",
  },
  shorekeeper: {
    basic: "Origin Pulse",
    skill: "Stellarealm Matrix",
    forte: "Chaos and Order",
    liberation: "End of the Sea Turns Clear",
  },
  yinlin: {
    basic: "Zap Puppetry",
    skill: "Magnetic Roar",
    forte: "Chameleon Strike",
    liberation: "Thundering Wrath",
  },
  jiyan: {
    basic: "Lone Lance",
    skill: "Windqueller",
    forte: "Qingloong's March",
    liberation: "Emerald Storm: Finale",
  },
  camellya: {
    basic: "Crimson Vine",
    skill: "Ephemeral Bloom",
    forte: "Sweet Somnolence",
    liberation: "Vow of Red Tears",
  },
  carlotta: {
    basic: "Aristocrat's Waltz",
    skill: "Frost Ribbon",
    forte: "Lace Dance",
    liberation: "Gilded Winter Rose",
  },
  roccia: {
    basic: "Checkered Trick",
    skill: "Carnival Surprise",
    forte: "Jester's Gambit",
    liberation: "Phantasmagoria Showtime",
  },
  phoebe: {
    basic: "Sunlight Chime",
    skill: "Gilded Prayer",
    forte: "Sacred Resonance",
    liberation: "Daybreak Chorus",
  },
  brant: {
    basic: "Pirate Cutlass",
    skill: "Tidal Plunder",
    forte: "Corsair Gale",
    liberation: "Leviathan Broadside",
  },
  cantarella: {
    basic: "Luminescent Drop",
    skill: "Abyssal Parasol",
    forte: "Jellyfish Bloom",
    liberation: "Deep Sea Requiem",
  },
  ciaccona: {
    basic: "Dryad's Branch",
    skill: "Verdant Echo",
    forte: "Antler Tempest",
    liberation: "Song of the Ancient Forest",
  },
  zani: {
    basic: "Shadow Tailor",
    skill: "Obsidian Horn",
    forte: "Eclipse Protocol",
    liberation: "Ramshead Judgement",
  },
  cartethyia: {
    basic: "Glacial Thorns",
    skill: "Frost Sovereign",
    forte: "Crystalline Crown",
    liberation: "Absolute Zero Domain",
  },
  lupa: {
    basic: "Raven Talon",
    skill: "Crimson Blitz",
    forte: "Gladiator Howl",
    liberation: "Feral Apex Overdrive",
  },
  xiangli_yao: {
    basic: "Prosthetic Punch",
    skill: "Deductive Matrix",
    forte: "Law of Computation",
    liberation: "Cogito Ergo Sum",
  },
  zhezhi: {
    basic: "Ink Brush Stroke",
    skill: "Manifest Canvas",
    forte: "Crane Flight",
    liberation: "Living Masterpiece",
  },
  phrolova: {
    basic: "Spider Lily Whip",
    skill: "Ghost Blossom",
    forte: "Crimson Haze",
    liberation: "Symphony of the Departed",
  },
  augusta: {
    basic: "Solar Scepter",
    skill: "Dawnbreak Flash",
    forte: "Radiant Bastion",
    liberation: "Aegis of the Sun",
  },
  iuno: {
    basic: "Celestial Chord",
    skill: "Starlight Cascade",
    forte: "Starfall Judgement",
    liberation: "Symphony of Cosmos",
  },
  qiuyuan: {
    basic: "Jade Rapier",
    skill: "Breezeform Step",
    forte: "Verdant Whirlwind",
    liberation: "Tempest Slash: Horizon",
  },
  chisa: {
    basic: "Zephyr Blade",
    skill: "Spring Breeze",
    forte: "Floral Vortex",
    liberation: "Bloom of the Emerald Sea",
  },
  lynae: {
    basic: "Glacial Dagger",
    skill: "Northern Blizzard",
    forte: "Frostbite Surge",
    liberation: "Queen of the Frozen Expanse",
  },
  yangyang: {
    basic: "Feathered Flight",
    skill: "Zephyr Song",
    forte: "Echoing Breeze",
    liberation: "Cyclone of Feathered Light",
  },
  chixia: {
    basic: "Pow Pow!",
    skill: "Whizzing Ingot",
    forte: "Blazing Flash",
    liberation: "Heroic Flare",
  },
  baizhi: {
    basic: "Glacial Pulse",
    skill: "Emergency Plan",
    forte: "Rejuvenating Spring",
    liberation: "Euphonia of Renewal",
  },
  verina: {
    basic: "Cultivation",
    skill: "Sprout Expansion",
    forte: "Starflower Bloom",
    liberation: "Arboreal Domain",
  },
  danjin: {
    basic: "Crimson Weave",
    skill: "Scarlet Inscription",
    forte: "Chaos Cleave",
    liberation: "Bloom of Crimson Petals",
  },
  sanhua: {
    basic: "Cold Flash",
    skill: "Frost Eruption",
    forte: "Ice Burst",
    liberation: "Glacial Bloom",
  },
  mortefi: {
    basic: "Flame Volley",
    skill: "High-Speed Fire",
    forte: "Fury Ignition",
    liberation: "Violent Sonata",
  },
  calcharo: {
    basic: "Bloodhound Slash",
    skill: "Extermination Order",
    forte: "Merciless Death",
    liberation: "Phantom Etching",
  },
  encore: {
    basic: "Wooly Strike",
    skill: "Thermal Cosmos",
    forte: "Cosmos Rave",
    liberation: "Cosmos: Rampage",
  },
  jianxin: {
    basic: "Fengyiquan",
    skill: "Calm Chi",
    forte: "Primordial Chi",
    liberation: "Purifying Wind",
  },
  lingyang: {
    basic: "Lion's Claws",
    skill: "Furious Roar",
    forte: "Lion's Pride",
    liberation: "Stirring Lion Dance",
  },
  taoqi: {
    basic: "Fortified Strike",
    skill: "Rocksteady Shield",
    forte: "Immovable Defense",
    liberation: "Mountain's Will",
  },
  aalto: {
    basic: "Misty Bullet",
    skill: "Shift Trick",
    forte: "Mist Gate",
    liberation: "Flower in the Mist",
  },
  yuanwu: {
    basic: "Thunder Strike",
    skill: "Leaping Lightning",
    forte: "Rumbling Thunder",
    liberation: "Blazing Gauntlet",
  },
  youhu: {
    basic: "Antique Strike",
    skill: "Antiques Appraisal",
    forte: "Fortune Shake",
    liberation: "Poetic Lucky Draw",
  },
  lumi: {
    basic: "Postal Drill",
    skill: "Spark Delivery",
    forte: "Express Surge",
    liberation: "Special Delivery Rush",
  },
  mornye: {
    basic: "Solar Thrust",
    skill: "Solar Blaze",
    forte: "Ignition Burst",
    liberation: "Eclipse Nova",
  },
  luuk_herssen: {
    basic: "Beacon Strike",
    skill: "Sentinel Light",
    forte: "Gilded Slash",
    liberation: "Luminous Bastion",
  },
  aemeath: {
    basic: "Infernal Touch",
    skill: "Infernal Flash",
    forte: "Molten Cleave",
    liberation: "Scorching Surge",
  },
  sigrika: {
    basic: "Volt Jab",
    skill: "Static Arc",
    forte: "Thunder Surge",
    liberation: "Superconductor Ray",
  },
  denia: {
    basic: "Zephyr Dart",
    skill: "Gale Step",
    forte: "Whirlwind Flurry",
    liberation: "Tempest Glide",
  },
  hiyuki: {
    basic: "Frost Piercer",
    skill: "Frost Shiver",
    forte: "Chilling Fang",
    liberation: "Glacial Avalanche",
  },
  lucilla: {
    basic: "Cryo Wand",
    skill: "Glacial Ward",
    forte: "Blizzard Cascade",
    liberation: "Absolute Zero Prism",
  },
  lucy: {
    basic: "Flame Tap",
    skill: "Blazing Beat",
    forte: "Rhythm Flare",
    liberation: "Crescendo Inferno",
  },
  rebecca: {
    basic: "Holy Beam",
    skill: "Radiant Hymn",
    forte: "Sanctuary Flash",
    liberation: "Aegis of Radiance",
  },
  suisui: {
    basic: "Icicle Dart",
    skill: "Crystal Drop",
    forte: "Permafrost Ray",
    liberation: "Glacial Mirror",
  },
  yangyang_xuanling: {
    basic: "Gloom Feather",
    skill: "Echoing Void",
    forte: "Abyssal Tempest",
    liberation: "Midnight Vortex",
  },
  qingxiao: {
    basic: "Gale Blade",
    skill: "Azure Slash",
    forte: "Skyward Gale",
    liberation: "Heavenly Whirlwind",
  },
  jingran: {
    basic: "Searing Palm",
    skill: "Crimson Ember",
    forte: "Blazing Impact",
    liberation: "Phoenix Flare",
  },
  suoming: {
    basic: "Shock Rapier",
    skill: "Voltaic Pulse",
    forte: "Lightning Spiral",
    liberation: "Thunderstorm Judgement",
  },
  hsin: {
    basic: "Shadow Dirk",
    skill: "Shadow Edge",
    forte: "Umbral Rend",
    liberation: "Phantom Eclipse",
  },
  buling: {
    basic: "Petal Whisk",
    skill: "Spring Bloom",
    forte: "Verdant Breeze",
    liberation: "Gale of Renewal",
  },
  galbrena: {
    basic: "Firebrand",
    skill: "Ignited Thrust",
    forte: "Combustion Impact",
    liberation: "Volcanic Cataclysm",
  },
};

export interface CustomSkillDef {
  power?: number;
  accuracy?: number;
  energyGain?: number;
  healPercent?: number | ((seq: number) => number);
  hpCostPercent?: number;
  barrierPercent?: number;
  lifestealPercent?: number;
  energySurge?: number;
  cooldown?: number;
  targetScope?: TargetScope;
  statusEffect?: {
    type: StatusEffectType;
    chance: number;
    duration: number;
  };
  selfBuff?: {
    type: StatusEffectType;
    duration: number;
  };
  debuff?: {
    stat: "atk" | "def" | "spd";
    multiplier: number;
    duration: number;
  };
  description: string | ((seq: number) => string);
  animationType?: "slash" | "blast" | "beam" | "burst" | "buff";
}

export const RESONATOR_SKILL_CUSTOMS: Record<string, CustomSkillDef> = {
  shorekeeper: {
    power: 40,
    targetScope: "ally_single",
    healPercent: (seq) => (seq >= 4 ? 24 : 20),
    energySurge: 20,
    selfBuff: { type: "buff_atk", duration: 2 },
    cooldown: 3,
    description: (seq) =>
      `Restores ${seq >= 4 ? "24%" : "20%"} Max HP to target ally, gains +20 Energy, and buffs ATK by +25% for 2 turns. (3T CD)`,
    animationType: "buff",
  },
  jiyan: {
    power: 85,
    targetScope: "blast",
    statusEffect: { type: "dizzy", chance: 0.4, duration: 2 },
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Deals 85 Aero DMG to target & adjacent foes (40% Dizzy chance). Boosts next attack by +50%.",
    animationType: "blast",
  },
  yinlin: {
    power: 75,
    targetScope: "blast",
    statusEffect: { type: "shock", chance: 0.7, duration: 2 },
    debuff: { stat: "def", multiplier: 0.75, duration: 2 },
    description: "Deals 75 Electro DMG to target & adjacent foes. Inflicts Shock and lowers enemy DEF by 25% for 2 turns.",
    animationType: "blast",
  },
  jinhsi: {
    power: 85,
    targetScope: "blast",
    statusEffect: { type: "stagnation", chance: 0.6, duration: 2 },
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Deals 85 Spectro DMG to target & adjacent foes, inflicts Stagnation (-25% ACC), and boosts next attack by +50%.",
    animationType: "beam",
  },
  changli: {
    power: 85,
    targetScope: "blast",
    selfBuff: { type: "buff_crit", duration: 2 },
    statusEffect: { type: "burn", chance: 0.6, duration: 2 },
    description: "Deals 85 Fusion DMG to target & adjacent foes (60% Burn chance). Grants +25% Crit Rate for 2 turns.",
    animationType: "slash",
  },
  zhezhi: {
    power: 70,
    targetScope: "single",
    energySurge: 30,
    statusEffect: { type: "freeze", chance: 0.45, duration: 1 },
    description: "Deals 70 Glacio DMG, gains +30 Energy (+35 Energy to lowest ally), with 45% chance to Freeze target.",
    animationType: "blast",
  },
  xiangli_yao: {
    power: 85,
    targetScope: "single",
    statusEffect: { type: "stun", chance: 0.4, duration: 1 },
    description: "Deals 85 Electro DMG with 40% chance to Stun the target.",
    animationType: "beam",
  },
  camellya: {
    power: 90,
    targetScope: "blast",
    hpCostPercent: 10,
    lifestealPercent: 35,
    selfBuff: { type: "buff_dodge", duration: 2 },
    description: "Costs 10% HP to deal 90 Havoc DMG to target & adjacent foes. Restores 35% damage as HP and gives +30% Dodge.",
    animationType: "slash",
  },
  carlotta: {
    power: 80,
    targetScope: "single",
    statusEffect: { type: "freeze", chance: 0.5, duration: 1 },
    debuff: { stat: "def", multiplier: 0.75, duration: 2 },
    description: "Deals 80 Glacio DMG with 50% Freeze chance and lowers enemy DEF by 25%.",
    animationType: "blast",
  },
  roccia: {
    power: 75,
    statusEffect: { type: "dizzy", chance: 0.6, duration: 2 },
    debuff: { stat: "atk", multiplier: 0.75, duration: 2 },
    description: "Deals 75 Havoc DMG. Inflicts Dizzy (-30% ACC) and lowers enemy ATK by 25%.",
    animationType: "blast",
  },
  phoebe: {
    power: 50,
    healPercent: 15,
    barrierPercent: 15,
    statusEffect: { type: "stagnation", chance: 0.5, duration: 2 },
    cooldown: 3,
    description: "Restores 15% Max HP, gains 15% Barrier, and inflicts Stagnation. (3T CD)",
    animationType: "buff",
  },
  brant: {
    power: 90,
    statusEffect: { type: "burn", chance: 0.7, duration: 2 },
    selfBuff: { type: "buff_atk", duration: 2 },
    description: "Deals 90 Fusion DMG with 70% Burn chance and gives +25% ATK for 2 turns.",
    animationType: "slash",
  },
  cantarella: {
    power: 75,
    statusEffect: { type: "vulnerable", chance: 0.7, duration: 2 },
    lifestealPercent: 30,
    description: "Deals 75 Havoc DMG, inflicts Vulnerable (+25% DMG taken), and restores 30% damage as HP.",
    animationType: "beam",
  },
  ciaccona: {
    power: 45,
    healPercent: 18,
    selfBuff: { type: "buff_dodge", duration: 2 },
    cooldown: 3,
    description: "Restores 18% Max HP and gives +30% Dodge for 2 turns. (3T CD)",
    animationType: "buff",
  },
  zani: {
    power: 80,
    statusEffect: { type: "stun", chance: 0.35, duration: 1 },
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Deals 80 Spectro DMG (35% Stun chance). Boosts next attack by +50%.",
    animationType: "slash",
  },
  cartethyia: {
    power: 85,
    statusEffect: { type: "debuff_spd", chance: 0.6, duration: 2 },
    selfBuff: { type: "buff_crit", duration: 2 },
    description: "Deals 85 Aero DMG, slows enemy speed, and gives +25% Crit Rate for 2 turns.",
    animationType: "blast",
  },
  lupa: {
    power: 90,
    statusEffect: { type: "burn", chance: 0.7, duration: 2 },
    selfBuff: { type: "buff_atk", duration: 2 },
    description: "Deals 90 Fusion DMG (70% Burn chance) and gives +25% ATK for 2 turns.",
    animationType: "slash",
  },
  phrolova: {
    power: 75,
    statusEffect: { type: "erosion", chance: 0.8, duration: 3 },
    debuff: { stat: "def", multiplier: 0.75, duration: 2 },
    description: "Deals 75 Havoc DMG. Inflicts Erosion and lowers enemy DEF by 25%.",
    animationType: "beam",
  },
  augusta: {
    power: 70,
    barrierPercent: 25,
    statusEffect: { type: "stun", chance: 0.35, duration: 1 },
    cooldown: 3,
    description: "Deals 70 Electro DMG, gains 25% Barrier, with 35% Stun chance. (3T CD)",
    animationType: "buff",
  },
  iuno: {
    power: 45,
    healPercent: 16,
    selfBuff: { type: "buff_crit", duration: 2 },
    cooldown: 3,
    description: "Restores 16% Max HP and gives +25% Crit Rate for 2 turns. (3T CD)",
    animationType: "buff",
  },
  qiuyuan: {
    power: 80,
    selfBuff: { type: "buff_dodge", duration: 2 },
    description: "Deals 80 Aero DMG and gives +30% Dodge for 2 turns.",
    animationType: "slash",
  },
  chisa: {
    power: 90,
    hpCostPercent: 10,
    lifestealPercent: 35,
    statusEffect: { type: "erosion", chance: 0.6, duration: 2 },
    description: "Costs 10% HP to deal 90 Havoc DMG. Restores 35% damage as HP (60% Erosion chance).",
    animationType: "slash",
  },
  lynae: {
    power: 50,
    healPercent: 15,
    barrierPercent: 20,
    cooldown: 3,
    description: "Restores 15% Max HP and grants a 20% Max HP Barrier. (3T CD)",
    animationType: "buff",
  },
  mornye: {
    power: 85,
    statusEffect: { type: "burn", chance: 0.65, duration: 2 },
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Deals 85 Fusion DMG (65% Burn chance). Boosts next attack by +50%.",
    animationType: "slash",
  },
  luuk_herssen: {
    power: 75,
    barrierPercent: 20,
    selfBuff: { type: "buff_atk", duration: 2 },
    description: "Deals 75 Spectro DMG, gains 20% Barrier, and gives +25% ATK for 2 turns.",
    animationType: "buff",
  },
  aemeath: {
    power: 85,
    selfBuff: { type: "buff_crit", duration: 2 },
    statusEffect: { type: "burn", chance: 0.6, duration: 2 },
    description: "Deals 85 Fusion DMG with 60% Burn chance and gives +25% Crit Rate for 2 turns.",
    animationType: "slash",
  },
  sigrika: {
    power: 80,
    statusEffect: { type: "stun", chance: 0.35, duration: 1 },
    description: "Deals 80 Electro DMG with 35% chance to Stun target.",
    animationType: "blast",
  },
  denia: {
    power: 75,
    selfBuff: { type: "buff_dodge", duration: 2 },
    statusEffect: { type: "dizzy", chance: 0.5, duration: 2 },
    description: "Deals 75 Aero DMG (50% Dizzy chance) and gives +30% Dodge for 2 turns.",
    animationType: "blast",
  },
  hiyuki: {
    power: 80,
    statusEffect: { type: "freeze", chance: 0.45, duration: 1 },
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Deals 80 Glacio DMG (45% Freeze chance). Boosts next attack by +50%.",
    animationType: "slash",
  },
  lucilla: {
    power: 50,
    healPercent: 18,
    barrierPercent: 15,
    cooldown: 3,
    description: "Restores 18% Max HP and gains 15% Barrier. (3T CD)",
    animationType: "buff",
  },
  lucy: {
    power: 85,
    statusEffect: { type: "burn", chance: 0.65, duration: 2 },
    selfBuff: { type: "buff_atk", duration: 2 },
    description: "Deals 85 Fusion DMG (65% Burn chance) and gives +25% ATK for 2 turns.",
    animationType: "slash",
  },
  rebecca: {
    power: 45,
    healPercent: 20,
    energySurge: 20,
    cooldown: 3,
    description: "Restores 20% Max HP and gives +20 Energy. (3T CD)",
    animationType: "buff",
  },
  suisui: {
    power: 75,
    statusEffect: { type: "freeze", chance: 0.4, duration: 1 },
    debuff: { stat: "def", multiplier: 0.75, duration: 2 },
    description: "Deals 75 Glacio DMG with 40% Freeze chance and lowers enemy DEF by 25%.",
    animationType: "blast",
  },
  yangyang_xuanling: {
    power: 85,
    statusEffect: { type: "erosion", chance: 0.7, duration: 2 },
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Deals 85 Havoc DMG (70% Erosion chance). Boosts next attack by +50%.",
    animationType: "slash",
  },
  qingxiao: {
    power: 80,
    statusEffect: { type: "dizzy", chance: 0.5, duration: 2 },
    selfBuff: { type: "buff_crit", duration: 2 },
    description: "Deals 80 Aero DMG (50% Dizzy chance) and gives +25% Crit Rate for 2 turns.",
    animationType: "slash",
  },
  jingran: {
    power: 90,
    statusEffect: { type: "burn", chance: 0.7, duration: 2 },
    description: "Deals 90 Fusion DMG with 70% chance to inflict Burn.",
    animationType: "blast",
  },
  suoming: {
    power: 80,
    statusEffect: { type: "shock", chance: 0.65, duration: 2 },
    energySurge: 20,
    description: "Deals 80 Electro DMG (65% Shock chance) and gives +20 Energy.",
    animationType: "blast",
  },
  hsin: {
    power: 85,
    lifestealPercent: 30,
    statusEffect: { type: "erosion", chance: 0.5, duration: 2 },
    description: "Deals 85 Havoc DMG (50% Erosion chance). Restores 30% damage as HP.",
    animationType: "slash",
  },
  buling: {
    power: 45,
    healPercent: 18,
    selfBuff: { type: "buff_dodge", duration: 2 },
    cooldown: 3,
    description: "Restores 18% Max HP and gives +30% Dodge for 2 turns. (3T CD)",
    animationType: "buff",
  },
  galbrena: {
    power: 85,
    statusEffect: { type: "burn", chance: 0.65, duration: 2 },
    selfBuff: { type: "buff_atk", duration: 2 },
    description: "Deals 85 Fusion DMG (65% Burn chance) and gives +25% ATK for 2 turns.",
    animationType: "slash",
  },
};

export const RESONATOR_FORTE_CUSTOMS: Record<string, Partial<BattleMove>> = {
  jinhsi: {
    power: 135,
    defPiercePercent: 35,
    description: "Incarnation dragon breath: pierces 35% of enemy DEF! (2T CD)",
    animationType: "beam",
  },
  changli: {
    power: 130,
    critBonus: 1.0, // 100% Guaranteed Crit!
    description: "Consumes 4 Enflamed feathers in an aerial fiery dive: Guaranteed 100% Critical Hit! (2T CD)",
    animationType: "slash",
  },
  shorekeeper: {
    power: 95,
    selfBuff: { type: "buff_crit", duration: 2 },
    description: "Expands Stellarealm: grants active resonator +25% Crit Rate and +25% ATK for 2 turns. (2T CD)",
    animationType: "buff",
  },
  yinlin: {
    power: 125,
    bonusDmgCondition: "target_status",
    bonusDmgMultiplier: 1.35,
    statusEffect: { type: "shock", chance: 0.8, duration: 2 },
    description: "Judgement Strike: deals +35% bonus DMG against Shocked targets and inflicts Shock! (2T CD)",
    animationType: "blast",
  },
  jiyan: {
    power: 130,
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Qingloong dragon rush: heavy Aero strike with 60% Knockdown chance. Boosts next attack by +40%! (2T CD)",
    animationType: "beam",
  },
  camellya: {
    power: 140,
    bonusDmgCondition: "low_hp",
    bonusDmgMultiplier: 1.35,
    lifestealPercent: 30,
    description: "Crimson frenzy: deals +35% bonus DMG if below 60% HP, restoring 30% DMG as HP. (2T CD)",
    animationType: "slash",
  },
  carlotta: {
    power: 125,
    bonusDmgCondition: "target_status",
    bonusDmgMultiplier: 1.5,
    description: "Glass rose shatter: deals +50% bonus DMG against Frozen targets! (2T CD)",
    animationType: "blast",
  },
  xiangli_yao: {
    power: 135,
    bonusDmgCondition: "target_status",
    bonusDmgMultiplier: 1.4,
    description: "Algorithmic deduction: deals +40% bonus DMG against Shocked or Stunned targets! (2T CD)",
    animationType: "beam",
  },
  zhezhi: {
    power: 120,
    energySurge: 25,
    selfBuff: { type: "buff_atk", duration: 2 },
    description: "Painted cranes: restores 25 Energy and grants +25% ATK for 2 turns. (2T CD)",
    animationType: "blast",
  },
};

export const RESONATOR_LIBERATION_CUSTOMS: Record<string, Partial<BattleMove>> = {
  shorekeeper: {
    power: 140,
    targetScope: "ally_team",
    healPercent: 22,
    teamHealPercent: 20,
    teamBarrierPercent: 15,
    cleanseDebuffs: true,
    description:
      "Outer Stellarealm: Cleanses party debuffs, restores 20% team HP, and grants 15% team Barrier.",
    animationType: "burst",
  },
  jinhsi: {
    power: 205,
    targetScope: "aoe",
    bonusDmgCondition: "target_status",
    bonusDmgMultiplier: 1.35,
    defPiercePercent: 25,
    description: "Purge of Light: deals massive Spectro DMG (+35% bonus DMG if target is Stagnated, pierces 25% DEF) to all enemies!",
    animationType: "burst",
  },
  changli: {
    power: 200,
    targetScope: "single",
    debuff: { stat: "def", multiplier: 0.7, duration: 3 },
    statusEffect: { type: "burn", chance: 0.8, duration: 3 },
    description: "Radiance of Feathers: crimson phoenix explosion dealing 200 Fusion DMG; shreds enemy DEF by 30% for 3 turns.",
    animationType: "burst",
  },
  yinlin: {
    power: 195,
    targetScope: "aoe",
    bonusDmgCondition: "target_status",
    bonusDmgMultiplier: 1.4,
    critBonus: 0.4,
    description: "Thundering Wrath: deals 195 Electro DMG to all enemies (+40% bonus DMG and +40% Crit Rate if target is Shocked)!",
    animationType: "burst",
  },
  jiyan: {
    power: 215,
    targetScope: "aoe",
    selfBuff: { type: "buff_next_attack", duration: 2 },
    description: "Emerald Storm: Finale: Qingloong cyclone sweeps all enemies with devastating Aero DMG and 80% Knockdown chance.",
    animationType: "burst",
  },
  camellya: {
    power: 210,
    targetScope: "blast",
    lifestealPercent: 50,
    description: "Vow of Red Tears: blood blossom vortex dealing 210 Havoc DMG to target & adjacent foes with 50% lifesteal.",
    animationType: "burst",
  },
  carlotta: {
    power: 190,
    targetScope: "aoe",
    statusEffect: { type: "freeze", chance: 1.0, duration: 1 },
    description: "Gilded Winter Rose: deep zero blizzard dealing 190 Glacio DMG to all enemies with 100% Freeze chance for 1 turn.",
    animationType: "burst",
  },
  xiangli_yao: {
    power: 210,
    targetScope: "single",
    statusEffect: { type: "stun", chance: 0.5, duration: 1 },
    description: "Cogito Ergo Sum: matrix calculation beam dealing 210 concentrated Electro DMG with 50% Stun chance.",
    animationType: "burst",
  },
  zhezhi: {
    power: 180,
    targetScope: "aoe",
    statusEffect: { type: "freeze", chance: 0.5, duration: 1 },
    description: "Living Masterpiece: deals 180 Glacio DMG with 50% Freeze chance and grants party +20 Energy.",
    animationType: "burst",
  },
};

// Prydwen-based Archetypes - Strictly Limited 5-Stars Only
const SUPPORTS = new Set(["shorekeeper", "phoebe", "ciaccona", "iuno", "lynae", "lucilla", "rebecca", "buling"]);
const SUB_DPS = new Set([
  "yinlin",
  "zhezhi",
  "xiangli_yao",
  "roccia",
  "cantarella",
  "zani",
  "cartethyia",
  "lupa",
  "phrolova",
  "sigrika",
  "denia",
  "suisui",
  "suoming",
  "hsin",
]);

export function createBattleResonator(
  charId: string,
  level: number = 100,
  sequence: number = 0
): BattleResonator {
  const allChars: any[] = [
    ...(charactersData.limitedResonators || []),
  ];
  const char = allChars.find((c) => c.id === charId) || {
    id: charId,
    name: charId.toUpperCase(),
    element: "Spectro",
    portraitUrl: `/assets/characters/${charId}_portrait.png`,
  };

  const element = (char.element || "Spectro") as ResonatorElement;
  const moveNames = CUSTOM_MOVES[charId] || {
    basic: "Strike",
    skill: `${element} Surge`,
    forte: `${element} Focus`,
    liberation: `${char.name} Burst`,
  };

  // Determine Archetype
  let archetype: "dps" | "support" | "sub_dps" = "dps";
  if (SUPPORTS.has(charId)) {
    archetype = "support";
  } else if (SUB_DPS.has(charId)) {
    archetype = "sub_dps";
  }

  // Sequence Node Multipliers (S0 - S6)
  const sAtkMult = 1 + (sequence >= 1 ? 0.05 : 0) + (sequence >= 4 ? 0.05 : 0) + (sequence >= 5 ? 0.05 : 0);
  const sDefMult = 1 + (sequence >= 2 ? 0.05 : 0);
  const sHpMult = 1 + (sequence >= 2 ? 0.05 : 0);
  const initialEnergy = sequence >= 3 ? 15 : 0;
  const isS6 = sequence >= 6;

  let maxHp: number;
  let atk: number;
  let def: number;
  let spd: number;

  if (archetype === "support") {
    maxHp = Math.round((3500 + level * 38) * sHpMult);
    atk = Math.round((280 + level * 7) * sAtkMult);
    def = Math.round((220 + level * 5.5) * sDefMult);
    spd = Math.round(100 + (char.weaponType === "Pistols" || char.weaponType === "Sword" ? 10 : 0));
  } else if (archetype === "dps") {
    maxHp = Math.round((3200 + level * 35) * sHpMult);
    atk = Math.round((360 + level * 9) * sAtkMult);
    def = Math.round((180 + level * 4.5) * sDefMult);
    spd = Math.round(105 + (char.weaponType === "Pistols" || char.weaponType === "Sword" ? 15 : 0));
  } else {
    maxHp = Math.round((3400 + level * 36) * sHpMult);
    atk = Math.round((320 + level * 8) * sAtkMult);
    def = Math.round((200 + level * 5) * sDefMult);
    spd = Math.round(115 + (char.weaponType === "Pistols" || char.weaponType === "Sword" ? 15 : 0));
  }

  // Build unique individual skill move
  let skillMove: BattleMove;
  const customSkill = RESONATOR_SKILL_CUSTOMS[charId];

  if (customSkill) {
    const healVal = typeof customSkill.healPercent === "function" ? customSkill.healPercent(sequence) : customSkill.healPercent;
    const descVal = typeof customSkill.description === "function" ? customSkill.description(sequence) : customSkill.description;

    skillMove = {
      id: `${charId}_skill`,
      name: moveNames.skill,
      category: "skill",
      element,
      targetScope: customSkill.targetScope ?? (archetype === "support" && (customSkill.healPercent || customSkill.barrierPercent) ? "ally_single" : "single"),
      power: customSkill.power ?? (archetype === "dps" ? 85 : archetype === "support" ? 45 : 75),
      accuracy: customSkill.accuracy ?? 98,
      energyGain: customSkill.energyGain ?? (archetype === "support" ? 20 : 35),
      healPercent: healVal,
      hpCostPercent: customSkill.hpCostPercent,
      barrierPercent: customSkill.barrierPercent,
      lifestealPercent: customSkill.lifestealPercent,
      energySurge: customSkill.energySurge,
      cooldown: customSkill.cooldown ?? ((customSkill.healPercent || (customSkill.statusEffect && (customSkill.statusEffect.type === "stun" || customSkill.statusEffect.type === "freeze"))) ? 3 : 2),
      statusEffect: customSkill.statusEffect,
      selfBuff: customSkill.selfBuff,
      debuff: customSkill.debuff,
      description: descVal,
      animationType: customSkill.animationType ?? (healVal || customSkill.barrierPercent ? "buff" : "blast"),
    };
  } else if (archetype === "support") {
    skillMove = {
      id: `${charId}_skill`,
      name: moveNames.skill,
      category: "skill",
      element,
      targetScope: "ally_single",
      power: 45,
      accuracy: 100,
      energyGain: 20,
      healPercent: sequence >= 4 ? 22 : 18,
      cooldown: 3,
      description: `Restores ${sequence >= 4 ? "22%" : "18%"} Max HP to target ally. (3T CD)`,
      animationType: "buff",
    };
  } else if (archetype === "dps") {
    skillMove = {
      id: `${charId}_skill`,
      name: moveNames.skill,
      category: "skill",
      element,
      targetScope: "single",
      power: 90,
      accuracy: 98,
      energyGain: 35,
      description: `Deals 90 ${element} DMG. Restores 35 Energy.`,
      animationType: "blast",
    };
  } else {
    let statusType: StatusEffectType = "shock";
    if (element === "Fusion") statusType = "burn";
    else if (element === "Glacio") statusType = "freeze";
    else if (element === "Electro") statusType = "shock";
    else if (element === "Spectro") statusType = "stagnation";
    else if (element === "Havoc") statusType = "erosion";
    else if (element === "Aero") statusType = "dizzy";

    skillMove = {
      id: `${charId}_skill`,
      name: moveNames.skill,
      category: "skill",
      element,
      targetScope: "single",
      power: 75,
      accuracy: 98,
      energyGain: 35,
      statusEffect: {
        type: statusType,
        chance: 0.65,
        duration: 2,
      },
      description: `Deals 75 ${element} DMG with 65% chance to inflict ${statusType.toUpperCase()}.`,
      animationType: "blast",
    };
  }

  // Build unique individual Forte move
  const customForte = RESONATOR_FORTE_CUSTOMS[charId] || {};
  const baseFortePwr = archetype === "dps" ? 125 : archetype === "support" ? 95 : 115;
  const forteMove: BattleMove = {
    id: `${charId}_forte`,
    name: moveNames.forte,
    category: "forte",
    element,
    targetScope: customForte.targetScope ?? (archetype === "support" ? "ally_team" : "single"),
    power: customForte.power ?? baseFortePwr,
    accuracy: customForte.accuracy ?? 95,
    energyGain: customForte.energyGain ?? 20,
    cooldown: customForte.cooldown ?? 2,
    defPiercePercent: customForte.defPiercePercent,
    critBonus: customForte.critBonus,
    bonusDmgCondition: customForte.bonusDmgCondition,
    bonusDmgMultiplier: customForte.bonusDmgMultiplier,
    statusEffect: customForte.statusEffect,
    selfBuff: customForte.selfBuff,
    debuff: customForte.debuff,
    barrierPercent: customForte.barrierPercent,
    healPercent: customForte.healPercent,
    description: customForte.description || `Deals heavy ${element} DMG with increased Knockdown chance. (2T CD)`,
    animationType: customForte.animationType ?? "beam",
  };

  // Build unique individual Liberation move
  const customLib = RESONATOR_LIBERATION_CUSTOMS[charId] || {};
  const baseLibPwr = isS6
    ? Math.round((archetype === "dps" ? 210 : archetype === "support" ? 140 : 185) * 1.15)
    : archetype === "dps" ? 210 : archetype === "support" ? 140 : 185;

  const liberationMove: BattleMove = {
    id: `${charId}_liberation`,
    name: moveNames.liberation,
    category: "liberation",
    element,
    targetScope:
      customLib.targetScope ??
      (archetype === "support"
        ? "ally_team"
        : archetype === "dps"
        ? "blast"
        : "single"),
    power: customLib.power ?? baseLibPwr,
    accuracy: customLib.accuracy ?? 100,
    energyGain: 0,
    energyCost: 100,
    healPercent: customLib.healPercent ?? (archetype === "support" ? (sequence >= 4 ? 22 : 18) : undefined),
    teamHealPercent: customLib.teamHealPercent,
    teamBarrierPercent: customLib.teamBarrierPercent,
    barrierPercent: customLib.barrierPercent,
    cleanseDebuffs: customLib.cleanseDebuffs,
    defPiercePercent: customLib.defPiercePercent,
    critBonus: customLib.critBonus,
    bonusDmgCondition: customLib.bonusDmgCondition,
    bonusDmgMultiplier: customLib.bonusDmgMultiplier,
    statusEffect: customLib.statusEffect,
    selfBuff: customLib.selfBuff,
    debuff: customLib.debuff,
    lifestealPercent: customLib.lifestealPercent,
    description:
      customLib.description ||
      (archetype === "support"
        ? `Heals ${sequence >= 4 ? "22%" : "18%"} Max HP and deals heavy ${element} DMG. (Requires 100 Energy)`
        : `Ultimate ${element} strike dealing massive DMG. (Requires 100 Energy)${isS6 ? " [S6: +15% PWR]" : ""}`),
    animationType: customLib.animationType ?? "burst",
  };

  const moves: BattleMove[] = [
    {
      id: `${charId}_basic`,
      name: moveNames.basic,
      category: "basic",
      element,
      targetScope: "single",
      power: archetype === "dps" ? 55 : archetype === "support" ? 45 : 50,
      accuracy: 100,
      energyGain: 25,
      description: `Deals basic ${element} DMG. Restores 25 Energy.`,
      animationType: "slash",
    },
    skillMove,
    forteMove,
    liberationMove,
  ];

  const spriteUrl = SPRITE_MAP[charId] || char.portraitUrl || `/assets/characters/${charId}_portrait.png`;
  const portraitUrl = char.portraitUrl || `/assets/characters/${charId}_portrait.png`;

  return {
    id: charId,
    name: char.name,
    element,
    archetype,
    level,
    hp: maxHp,
    maxHp,
    atk,
    def,
    spd,
    energy: initialEnergy,
    maxEnergy: 100,
    moves,
    spriteUrl,
    portraitUrl,
    isFainted: false,
    isGuarding: false,
    isDowned: false,
    downImmunityTurns: 0,
    skillCooldown: 0,
    moveCooldowns: {},
    ccImmunityTurns: 0,
    statusEffects: [],
    sequence,
    isS6,
  };
}
