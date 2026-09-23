export type ResonatorElement =
  | "Spectro"
  | "Havoc"
  | "Fusion"
  | "Glacio"
  | "Electro"
  | "Aero";

export type MoveCategory = "basic" | "skill" | "forte" | "liberation";

export type StatusEffectType =
  | "burn"
  | "freeze"
  | "shock"
  | "stagnation"
  | "erosion"
  | "dizzy"
  | "stun"
  | "vulnerable"
  | "buff_atk"
  | "buff_def"
  | "buff_crit"
  | "buff_next_attack"
  | "buff_dodge"
  | "debuff_def"
  | "debuff_atk"
  | "debuff_spd";

export type TargetScope =
  | "single"
  | "blast"
  | "aoe"
  | "ally_single"
  | "ally_team"
  | "self";

export interface StatusEffect {
  type: StatusEffectType;
  duration: number; // turns remaining
}

export interface BattleMove {
  id: string;
  name: string;
  category: MoveCategory;
  element: ResonatorElement;
  targetScope?: TargetScope;
  power: number;
  accuracy: number; // e.g. 100
  energyGain: number; // e.g. 20 for basic, 30 for skill
  energyCost?: number; // 100 for liberation
  healPercent?: number; // e.g. 30 for 30% max HP heal
  hpCostPercent?: number; // e.g. 15 for 15% user HP cost
  statusEffect?: {
    type: StatusEffectType;
    chance: number; // 0.0 - 1.0
    duration: number;
  };
  selfBuff?: {
    type: StatusEffectType;
    duration: number;
  };
  barrierPercent?: number; // e.g. 25 for 25% max HP shield
  lifestealPercent?: number; // e.g. 35 for 35% of damage dealt converted to HP
  energySurge?: number; // e.g. 25 for +25 instant bonus Resonance Energy
  debuff?: {
    stat: "atk" | "def" | "spd";
    multiplier: number; // e.g. 0.75 for -25%
    duration: number;
  };
  cooldown?: number; // turns cooldown
  defPiercePercent?: number; // e.g. 35 for ignoring 35% DEF
  critBonus?: number; // e.g. 1.0 for guaranteed crit or 0.25 for +25%
  cleanseDebuffs?: boolean; // cleanses negative status effects from user/team
  teamHealPercent?: number; // heals all living party members by X%
  teamBarrierPercent?: number; // grants all living party members an X% barrier
  bonusDmgCondition?: "target_status" | "low_hp" | "target_downed";
  bonusDmgMultiplier?: number; // e.g. 1.35 for +35% DMG
  description: string;
  animationType?: "slash" | "blast" | "beam" | "burst" | "buff";
}

export interface BattleResonator {
  id: string;
  name: string;
  element: ResonatorElement;
  archetype?: "dps" | "support" | "sub_dps";
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  energy: number; // 0 - 100
  maxEnergy: number; // 100
  moves: BattleMove[];
  spriteUrl: string;
  portraitUrl: string;
  isFainted: boolean;
  isGuarding?: boolean;
  isDowned?: boolean;
  downImmunityTurns?: number;
  skillCooldown?: number;
  moveCooldowns?: Record<string, number>;
  ccImmunityTurns?: number;
  statusEffects?: StatusEffect[];
  sequence?: number; // 0 to 6 (S0 to S6)
  isS6?: boolean;
  isOverdrive?: boolean;
  barrierHp?: number;
  hasTriggeredOverdrive?: boolean;
  dodgeRate?: number; // 0 - 100% evasion chance
}

export interface TimelineEntry {
  id: string;
  trainerId: string;
  isPlayer: boolean;
  teamIndex: number;
  slotIndex: number;
  actionValue: number;
  speed: number;
  isInterrupt?: boolean;
}

export interface BattleTrainer {
  id: string;
  username: string;
  avatarId: string;
  customTitle?: string;
  team: BattleResonator[];
  activeIdx: number;
  activeIndices?: number[];
  isAi: boolean;
}

export interface BattleLogEntry {
  id: string;
  text: string;
  type:
    | "info"
    | "damage"
    | "crit"
    | "heal"
    | "effective"
    | "switch"
    | "faint"
    | "liberation"
    | "one_more"
    | "guard"
    | "status"
    | "down"
    | "overdrive";
}

export interface TypeMatchup {
  multiplier: number;
  text: "super" | "resisted" | "neutral";
}

export type BlessingEffectType =
  | "damage"
  | "heal"
  | "barrier"
  | "damage_reduction"
  | "crit"
  | "energy"
  | "speed"
  | "revive"
  | "stat_atk"
  | "stat_def"
  | "stat_crit"
  | "freeze_chance"
  | "crit_energy"
  | "heal_on_hit"
  | "switch_cd"
  | "barrier_start"
  | "liberation_boost"
  | "team_heal"
  | "low_hp_dmg";

export interface TowerBlessing {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
  icon?: string;
  effectType: BlessingEffectType;
  value: number;
}

export interface TowerRunState {
  currentFloor: number; // 1, 2, 3, ... infinite
  activeBlessings: TowerBlessing[];
  partyHpMap: Record<string, number>; // charId -> current HP
  isCompleted: boolean;
  highestFloorCleared: number;
  allTimeRecordFloor?: number; // Lifetime best record preserved across resets
  lockedPartyIds?: string[]; // 6 Resonators permanently locked for the active run
  isWipedOut?: boolean; // True when all locked party members have fainted
}
