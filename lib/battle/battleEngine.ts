import { BattleMove, BattleResonator, BattleTrainer, StatusEffectType, TimelineEntry } from "./types";
import { getTypeMatchup } from "./typeChart";

export interface TurnDamageResult {
  damage: number;
  isCrit: boolean;
  typeMultiplier: number;
  typeEffectiveness: "super" | "resisted" | "neutral";
  defenderFainted: boolean;
  triggeredOneMore: boolean;
  knockedDown: boolean;
  statusApplied?: StatusEffectType;
  healAmount?: number;
  hpCostAmount?: number;
  missed?: boolean;
  dodged?: boolean;
  guarded?: boolean;
  triggeredOverdrive?: boolean;
  barrierDamage?: number;
  logs?: string[];
}

export interface StatusTurnResult {
  dotDamage: number;
  energyDrained: number;
  skipTurn: boolean;
  skipReason?: "freeze" | "shock" | "stun";
  stoodUp: boolean;
  fainted: boolean;
  logs: string[];
}

/**
 * Executes a move, calculating damage, status effects, heals, crits, and 1 MORE / Down.
 */
export function executeMoveDamage(
  attacker: BattleResonator,
  defender: BattleResonator,
  move: BattleMove,
  isOneMoreTurn: boolean = false,
  options?: {
    activeBlessings?: import("./types").TowerBlessing[];
    isBossFight?: boolean;
  }
): TurnDamageResult {
  const logs: string[] = [];

  // 1. Accuracy Check & Miss (incorporating Defender Dodge Chance & Evasion Buffs)
  let accuracy = move.accuracy || 100;
  let defenderDodge = defender.dodgeRate || 0;
  if (defender.statusEffects?.some((s) => s.type === "buff_dodge")) {
    defenderDodge += 30;
  }
  if (defenderDodge > 0) {
    accuracy -= defenderDodge;
  }
  if (attacker.statusEffects?.some((s) => s.type === "stagnation")) {
    accuracy -= 25;
  }
  if (attacker.statusEffects?.some((s) => s.type === "debuff_spd")) {
    accuracy -= 15;
  }
  if (attacker.isDowned) {
    accuracy -= 20; // Recovery penalty
  }
  if (attacker.statusEffects?.some((s) => s.type === "dizzy") && Math.random() < 0.4) {
    accuracy = 0; // Dizzy move failure
  }

  const roll = Math.random() * 100;
  if (roll > accuracy && move.power > 0) {
    const isDodgeRoll = defenderDodge > 0 && roll > ((move.accuracy || 100) - defenderDodge);
    const missLog = isDodgeRoll
      ? `💨 ${defender.name} agilely dodged ${attacker.name}'s ${move.name}!`
      : `❌ ${attacker.name}'s ${move.name} missed ${defender.name}!`;
    return {
      damage: 0,
      isCrit: false,
      typeMultiplier: 1.0,
      typeEffectiveness: "neutral",
      defenderFainted: false,
      triggeredOneMore: false,
      knockedDown: false,
      missed: true,
      dodged: isDodgeRoll,
      logs: [missLog],
    };
  }

  // Set Independent Move Cooldown if specified
  if (!attacker.moveCooldowns) {
    attacker.moveCooldowns = {};
  }
  if (move.cooldown && move.cooldown > 0) {
    attacker.moveCooldowns[move.id] = move.cooldown;
    if (move.category === "skill") {
      attacker.skillCooldown = move.cooldown;
    }
  }

  // 2. Self-Healing
  let healAmount: number | undefined;
  if (move.healPercent && move.healPercent > 0) {
    healAmount = Math.round(attacker.maxHp * (move.healPercent / 100));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
    if (!move.cooldown) {
      attacker.moveCooldowns[move.id] = 2;
      attacker.skillCooldown = 2;
    }
  }

  // 2b. Barrier Grant
  if (move.barrierPercent && move.barrierPercent > 0) {
    const barrierGain = Math.round(attacker.maxHp * (move.barrierPercent / 100));
    attacker.barrierHp = (attacker.barrierHp || 0) + barrierGain;
    logs.push(`🛡️ Barrier active (+${barrierGain} shield)!`);
  }

  // 2c. Energy Surge
  if (move.energySurge && move.energySurge > 0) {
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + move.energySurge);
  }

  // 3. User HP Cost (for high-risk brawler moves)
  let hpCostAmount: number | undefined;
  if (move.hpCostPercent && move.hpCostPercent > 0) {
    hpCostAmount = Math.round(attacker.maxHp * (move.hpCostPercent / 100));
    attacker.hp = Math.max(1, attacker.hp - hpCostAmount);
  }

  // 4. Type Matchup
  const { multiplier, text: typeEffectiveness } = getTypeMatchup(move.element, defender.element);

  // 5. Critical Hit Check
  let critChance = 0.12;
  if (attacker.archetype === "dps") critChance += 0.12;
  if (attacker.sequence && attacker.sequence >= 5) critChance += 0.05; // S5 Node bonus: +5% Crit Rate
  if (attacker.statusEffects?.some((s) => s.type === "buff_crit")) critChance += 0.25;
  if (defender.statusEffects?.some((s) => s.type === "shock")) critChance += 0.25;
  if (defender.statusEffects?.some((s) => s.type === "freeze")) critChance = 1.0; // Auto-crit on frozen!
  if (options?.activeBlessings) {
    const critBonusPct = options.activeBlessings
      .filter((b) => b.effectType === "crit" || b.id === "blessing_crit_mastery")
      .reduce((sum, b) => sum + (b.value || 15), 0);
    if (critBonusPct > 0) critChance += critBonusPct / 100;
  }
  if (move.critBonus) critChance += move.critBonus;

  const isCrit = move.power > 0 && Math.random() < critChance;
  const critMultiplier = isCrit ? 1.4 : 1.0;
  const variance = 0.94 + Math.random() * 0.12; // 0.94 - 1.06 (tightened variance for consistency)

  // 6. Stat Modifiers (Buffs / Debuffs / Statuses)
  let effectiveAtk = attacker.atk;
  if (attacker.statusEffects?.some((s) => s.type === "buff_atk")) effectiveAtk *= 1.25;
  if (attacker.statusEffects?.some((s) => s.type === "debuff_atk")) effectiveAtk *= 0.8;

  let effectiveDef = defender.def;
  if (move.defPiercePercent) {
    effectiveDef *= Math.max(0.2, 1 - move.defPiercePercent / 100);
    logs.push(`🗡️ DEF Pierced (-${move.defPiercePercent}%)!`);
  }
  if (defender.statusEffects?.some((s) => s.type === "buff_def")) effectiveDef *= 1.3;
  if (defender.statusEffects?.some((s) => s.type === "debuff_def")) effectiveDef *= 0.75;
  if (defender.statusEffects?.some((s) => s.type === "burn")) effectiveDef *= 0.8; // Burn shreds DEF

  // 7. Base Damage Calculation (Smooth DEF Mitigation Curve - The Sweet Spot)
  // Replaces swingy linear Atk/Def with Def / (Def + 750) mitigation curve.
  // Standardizes 3-5 turn survivability: no 1-shots, no 25-turn stall wars.
  let baseDamage = 0;
  if (move.power > 0) {
    const defMitigation = effectiveDef / (effectiveDef + 750);
    const levelFactor = (2 * attacker.level) / 5 + 2;
    const atkRatio = effectiveAtk / (defender.def || 500);
    const atkScale = Math.min(1.4, Math.max(0.7, 0.5 + atkRatio * 0.5));
    baseDamage = levelFactor * move.power * (1 - defMitigation) * atkScale * 0.72 + 15;
  }

  // Guard & Down modifiers
  const guardMult = defender.isGuarding ? 0.5 : 1.0;
  const downMult = defender.isDowned ? 1.2 : 1.0;

  // Next Attack Charge Boost
  let nextAttackMult = 1.0;
  if (move.power > 0 && attacker.statusEffects?.some((s) => s.type === "buff_next_attack")) {
    nextAttackMult = 1.4;
    attacker.statusEffects = attacker.statusEffects.filter((s) => s.type !== "buff_next_attack");
    logs.push(`💥 Charged attack (+40% DMG)!`);
  }

  // Vulnerability
  let vulnerableMult = 1.0;
  if (defender.statusEffects?.some((s) => s.type === "vulnerable")) {
    vulnerableMult = 1.25;
  }

  // Conditional Bonus Damage (e.g. Carlotta vs Freeze, Yinlin vs Shock, Danjin low HP)
  let conditionalMult = 1.0;
  if (move.bonusDmgCondition && move.bonusDmgMultiplier) {
    if (move.bonusDmgCondition === "target_status") {
      const hasSynergy =
        (move.element === "Glacio" && defender.statusEffects?.some((s) => s.type === "freeze")) ||
        (move.element === "Electro" && defender.statusEffects?.some((s) => s.type === "shock")) ||
        (move.element === "Spectro" && defender.statusEffects?.some((s) => s.type === "stagnation")) ||
        (move.element === "Fusion" && defender.statusEffects?.some((s) => s.type === "burn")) ||
        (move.element === "Havoc" && defender.statusEffects?.some((s) => s.type === "erosion"));
      if (hasSynergy) {
        conditionalMult = move.bonusDmgMultiplier;
        logs.push(`✨ Status Synergy: +${Math.round((move.bonusDmgMultiplier - 1) * 100)}% DMG!`);
      }
    } else if (move.bonusDmgCondition === "low_hp" && attacker.hp <= attacker.maxHp * 0.5) {
      conditionalMult = move.bonusDmgMultiplier;
      logs.push(`🩸 Blood Frenzy: +${Math.round((move.bonusDmgMultiplier - 1) * 100)}% DMG (Low HP)!`);
    } else if (move.bonusDmgCondition === "target_downed" && defender.isDowned) {
      conditionalMult = move.bonusDmgMultiplier;
      logs.push(`💥 Downed Punish: +${Math.round((move.bonusDmgMultiplier - 1) * 100)}% DMG!`);
    }
  }

  // Cleanse Debuffs
  if (move.cleanseDebuffs && attacker.statusEffects) {
    attacker.statusEffects = attacker.statusEffects.filter(
      (s) =>
        s.type === "buff_atk" ||
        s.type === "buff_def" ||
        s.type === "buff_crit" ||
        s.type === "buff_next_attack" ||
        s.type === "buff_dodge"
    );
    logs.push(`✨ Purified: All negative statuses cleansed!`);
  }

  let totalDamage =
    move.power > 0
      ? Math.max(
          1,
          Math.round(
            baseDamage *
              multiplier *
              critMultiplier *
              variance *
              guardMult *
              downMult *
              nextAttackMult *
              vulnerableMult *
              conditionalMult
          )
        )
      : 0;

  // Damage Ceiling Safety Check: prevent single-hit 100% wipes against non-bosses
  if (!options?.isBossFight && move.power > 0 && totalDamage > defender.maxHp * 0.65) {
    totalDamage = Math.round(defender.maxHp * 0.65);
  }

  // Tower Blessings Damage & Defense Modifiers
  if (options?.activeBlessings) {
    const dmgBonusPct = options.activeBlessings
      .filter((b) => b.effectType === "damage" || b.effectType === "stat_atk")
      .reduce((sum, b) => sum + (b.value || 0), 0);
    if (dmgBonusPct > 0) {
      totalDamage = Math.round(totalDamage * (1 + dmgBonusPct / 100));
    }

    const dmgReducPct = options.activeBlessings
      .filter((b) => b.effectType === "damage_reduction" || b.effectType === "stat_def")
      .reduce((sum, b) => sum + (b.value || 0), 0);
    if (dmgReducPct > 0) {
      totalDamage = Math.round(totalDamage * Math.max(0.2, 1 - dmgReducPct / 100));
    }

    if (move.category === "liberation" && options.activeBlessings.some((b) => b.id === "blessing_liberation_overflow")) {
      totalDamage = Math.round(totalDamage * 1.35);
    }
    if (attacker.hp <= attacker.maxHp * 0.5 && options.activeBlessings.some((b) => b.id === "blessing_adversity_resolve")) {
      totalDamage = Math.round(totalDamage * 1.4);
    }
    if (defender.hp <= defender.maxHp * 0.3 && options.activeBlessings.some((b) => b.id === "blessing_executioner")) {
      totalDamage = Math.round(totalDamage * 1.5);
    }
  }

  // Barrier Absorption
  let barrierDamage = 0;
  if (defender.barrierHp && defender.barrierHp > 0) {
    barrierDamage = Math.min(defender.barrierHp, totalDamage);
    defender.barrierHp -= barrierDamage;
    logs.push(`🛡️ Barrier absorbed ${barrierDamage} damage! (${defender.barrierHp} barrier remaining)`);
  }
  const damageToHp = totalDamage - barrierDamage;

  let newHp = Math.max(0, defender.hp - damageToHp);

  // Resonator Grit: Survive lethal hit with 1 HP if starting at >= 75% HP (once per battle)
  if (newHp === 0 && defender.hp >= defender.maxHp * 0.75 && !(defender as any).hasTriggeredGrit) {
    (defender as any).hasTriggeredGrit = true;
    newHp = 1;
    logs.push(`🛡️ Resonator Grit! ${defender.name} endured the fatal blow with 1 HP!`);
  }

  defender.hp = newHp;
  defender.isFainted = newHp === 0;

  // Energy generation when taking damage
  if (!defender.isFainted && totalDamage > 0) {
    defender.energy = Math.min(100, (defender.energy || 0) + 10);
  }

  // Overdrive Phase 2 Trigger (at <= 50% HP for Lv. 80+ Bosses or Tower Bosses)
  let triggeredOverdrive = false;
  const isEligibleBoss = options?.isBossFight || defender.level >= 80;
  if (
    !defender.isFainted &&
    !defender.hasTriggeredOverdrive &&
    isEligibleBoss &&
    defender.hp <= defender.maxHp * 0.5
  ) {
    defender.hasTriggeredOverdrive = true;
    defender.isOverdrive = true;
    defender.barrierHp = (defender.barrierHp || 0) + Math.round(defender.maxHp * 0.25);
    defender.energy = Math.min(100, defender.energy + 50);
    defender.atk = Math.round(defender.atk * 1.15);
    triggeredOverdrive = true;
    logs.push(`⚡ OVERDRIVE PHASE 2 ACTIVATED! Boss gained Resonance Barrier (+25% HP), +50 Energy & +15% ATK!`);
  }

  // Tower Blessings On-Hit Effects
  if (options?.activeBlessings?.some((b) => b.id === "blessing_havoc_siphon") && totalDamage > 0) {
    const siphon = Math.round(totalDamage * 0.15);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + siphon);
    logs.push(`🩸 Havoc Siphon restored ${siphon} HP!`);
  }
  if (options?.activeBlessings?.some((b) => b.id === "blessing_thunder_surge") && isCrit) {
    attacker.energy = Math.min(100, attacker.energy + 25);
    logs.push(`⚡ Thunder Surge generated +25 Resonance Energy!`);
  }

  // Move-specific Lifesteal
  if (move.lifestealPercent && move.lifestealPercent > 0 && totalDamage > 0) {
    const lifestealHeal = Math.round(totalDamage * (move.lifestealPercent / 100));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + lifestealHeal);
    logs.push(`🩸 ${attacker.name} restored +${lifestealHeal} HP from lifesteal!`);
  }

  // 8. Thaw Freeze on hit
  if (totalDamage > 0 && defender.statusEffects) {
    defender.statusEffects = defender.statusEffects.filter((s) => s.type !== "freeze");
  }

  // 9. Knockdown & 1 MORE Detection
  let triggeredOneMore = false;
  let knockedDown = false;

  if (defender.isGuarding) {
    // Guard completely blocks 1 More and Knockdown
  } else if (!defender.isFainted) {
    const hasDownImmunity = (defender.downImmunityTurns || 0) > 0;
    if (!defender.isDowned && !hasDownImmunity && (typeEffectiveness === "super" || isCrit)) {
      const downChance = isCrit ? 0.35 : 0.30;
      if (Math.random() < downChance) {
        knockedDown = true;
        defender.isDowned = true;
        defender.downImmunityTurns = 2;
        // 1 MORE! strictly triggers ONLY on fresh Knockdown and NEVER chains into another 1 MORE
        if (!isOneMoreTurn) {
          triggeredOneMore = true;
        }
      }
    }
  }

  // 10. Status Effect Infliction
  let statusApplied: StatusEffectType | undefined;
  let inflictChance = move.statusEffect?.chance || 0;
  if (move.element === "Glacio" && options?.activeBlessings?.some((b) => b.id === "blessing_frostbite")) {
    inflictChance += 0.35;
  }

  if (
    move.statusEffect &&
    !defender.isGuarding &&
    !defender.isFainted &&
    Math.random() < inflictChance
  ) {
    const isCC = move.statusEffect.type === "stun" || move.statusEffect.type === "freeze";
    if (isCC && (defender.ccImmunityTurns || 0) > 0) {
      logs.push(`🛡️ ${defender.name} resisted ${move.statusEffect.type.toUpperCase()} (CC Immunity)!`);
    } else {
      defender.statusEffects = defender.statusEffects || [];
      const existingIdx = defender.statusEffects.findIndex((s) => s.type === move.statusEffect!.type);
      if (existingIdx !== -1) {
        defender.statusEffects[existingIdx].duration = move.statusEffect.duration;
      } else {
        defender.statusEffects.push({
          type: move.statusEffect.type,
          duration: move.statusEffect.duration,
        });
      }
      statusApplied = move.statusEffect.type;
    }
  }

  // 10b. Self-Buff Inscription (active for subsequent moves/turns)
  if (move.selfBuff && !attacker.isFainted) {
    attacker.statusEffects = attacker.statusEffects || [];
    const existingIdx = attacker.statusEffects.findIndex((s) => s.type === move.selfBuff!.type);
    if (existingIdx !== -1) {
      attacker.statusEffects[existingIdx].duration = move.selfBuff.duration;
    } else {
      attacker.statusEffects.push({
        type: move.selfBuff.type,
        duration: move.selfBuff.duration,
      });
    }
  }

  // 11. Energy Updates
  if (move.category === "liberation") {
    attacker.energy = 0;
  } else if (!attacker.statusEffects?.some((s) => s.type === "stagnation")) {
    const energyBonusPct = options?.activeBlessings
      ?.filter((b) => b.effectType === "energy")
      .reduce((sum, b) => sum + (b.value || 0), 0) ?? 0;
    const baseEnergyGain = move.energyGain || 25;
    const effectiveEnergyGain = Math.round(baseEnergyGain * (1 + energyBonusPct / 100));
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + effectiveEnergyGain);
  }

  return {
    damage: totalDamage,
    isCrit,
    typeMultiplier: multiplier,
    typeEffectiveness,
    defenderFainted: defender.isFainted,
    triggeredOneMore,
    knockedDown,
    statusApplied,
    healAmount,
    hpCostAmount,
    guarded: defender.isGuarding,
    triggeredOverdrive,
    barrierDamage,
    logs,
  };
}

/**
 * Processes status effects, standing up from Down, and cooldowns at turn start.
 */
export function processTurnStartStatus(resonator: BattleResonator): StatusTurnResult {
  const logs: string[] = [];
  let dotDamage = 0;
  let energyDrained = 0;
  let skipTurn = false;
  let skipReason: "freeze" | "shock" | "stun" | undefined;
  let stoodUp = false;

  // 1. Recover from DOWN
  if (resonator.isDowned) {
    resonator.isDowned = false;
    stoodUp = true;
    logs.push(`${resonator.name} got back up!`);
  }

  // 2. Decrement Down Immunity
  if (resonator.downImmunityTurns && resonator.downImmunityTurns > 0) {
    resonator.downImmunityTurns -= 1;
  }

  // 3. Decrement Independent Move Cooldowns & CC Immunity
  if (resonator.moveCooldowns) {
    for (const moveId of Object.keys(resonator.moveCooldowns)) {
      if (resonator.moveCooldowns[moveId] > 0) {
        resonator.moveCooldowns[moveId] -= 1;
      }
    }
  }
  if (resonator.skillCooldown && resonator.skillCooldown > 0) {
    resonator.skillCooldown -= 1;
  }
  if (resonator.ccImmunityTurns && resonator.ccImmunityTurns > 0) {
    resonator.ccImmunityTurns -= 1;
  }

  // Reset Guard at turn start
  resonator.isGuarding = false;

  if (!resonator.statusEffects || resonator.statusEffects.length === 0) {
    return { dotDamage: 0, energyDrained: 0, skipTurn: false, stoodUp, fainted: false, logs };
  }

  // 4. Process each status effect
  resonator.statusEffects.forEach((status) => {
    if (status.type === "burn") {
      const burnDmg = Math.max(1, Math.round(resonator.maxHp * 0.08));
      dotDamage += burnDmg;
      logs.push(`${resonator.name} took ${burnDmg} damage from Burn!`);
    } else if (status.type === "erosion") {
      const erosionDmg = Math.max(1, Math.round(resonator.maxHp * 0.06));
      dotDamage += erosionDmg;
      energyDrained += 15;
      logs.push(`${resonator.name} took ${erosionDmg} damage and lost 15 Energy from Erosion!`);
    } else if (status.type === "freeze") {
      skipTurn = true;
      skipReason = "freeze";
      logs.push(`${resonator.name} is frozen solid and cannot move!`);
    } else if (status.type === "shock" && Math.random() < 0.35) {
      skipTurn = true;
      skipReason = "shock";
      logs.push(`${resonator.name} is paralyzed by Shock!`);
    } else if (status.type === "stun") {
      skipTurn = true;
      skipReason = "stun";
      logs.push(`${resonator.name} is stunned and cannot act!`);
    }
  });

  // Apply DoT damage
  if (dotDamage > 0) {
    resonator.hp = Math.max(0, resonator.hp - dotDamage);
    if (resonator.hp === 0) {
      resonator.isFainted = true;
    }
  }

  // Apply Energy drain
  if (energyDrained > 0) {
    resonator.energy = Math.max(0, resonator.energy - energyDrained);
  }

  // Decrement status durations
  resonator.statusEffects = resonator.statusEffects
    .map((s) => ({ ...s, duration: s.duration - 1 }))
    .filter((s) => {
      if (s.duration <= 0) {
        logs.push(`${resonator.name}'s ${s.type.toUpperCase()} wore off.`);
        if (s.type === "freeze" || s.type === "stun") {
          resonator.ccImmunityTurns = 1;
        }
        return false;
      }
      return true;
    });

  return {
    dotDamage,
    energyDrained,
    skipTurn,
    skipReason,
    stoodUp,
    fainted: resonator.isFainted,
    logs,
  };
}

/**
 * Strategic AI Decision Making (Persona 3 Reload style).
 */
export function chooseAiAction(
  aiTrainer: BattleTrainer,
  opponentResonator: BattleResonator
): {
  type: "move" | "switch" | "guard";
  moveIdx?: number;
  switchIdx?: number;
} {
  const active = aiTrainer.team[aiTrainer.activeIdx];
  if (!active || active.isFainted) {
    const availableIdx = aiTrainer.team.findIndex((r) => !r.isFainted);
    return { type: "switch", switchIdx: Math.max(0, availableIdx) };
  }

  // 1. Tactical Guard Check:
  // If opponent has 100 Energy (Liberation ready) or active has low HP vs lethal counter element
  const { multiplier: oppMultiplier } = getTypeMatchup(opponentResonator.element, active.element);
  if (
    (opponentResonator.energy >= 100 || (oppMultiplier > 1.0 && active.hp < active.maxHp * 0.4)) &&
    Math.random() < 0.5
  ) {
    return { type: "guard" };
  }

  // 2. Heal Priority:
  // If HP < 45% and a heal move is off cooldown
  const healIdx = active.moves.findIndex(
    (m) => m.healPercent && m.healPercent > 0 && (!active.moveCooldowns?.[m.id] || active.moveCooldowns[m.id] === 0)
  );
  if (healIdx !== -1 && active.hp < active.maxHp * 0.45) {
    return { type: "move", moveIdx: healIdx };
  }

  // 3. Resonance Liberation:
  const libIdx = active.moves.findIndex(
    (m) => m.category === "liberation" && active.energy >= 100 && (!active.moveCooldowns?.[m.id] || active.moveCooldowns[m.id] === 0)
  );
  if (libIdx !== -1) {
    return { type: "move", moveIdx: libIdx };
  }

  // 4. Prioritize Super Effective / High Impact moves
  let bestIdx = 0;
  let highestScore = -1;

  active.moves.forEach((move, idx) => {
    if (move.category === "liberation" && active.energy < 100) return;
    if (active.moveCooldowns && (active.moveCooldowns[move.id] || 0) > 0) return;

    const { multiplier } = getTypeMatchup(move.element, opponentResonator.element);
    let score = move.power * multiplier;

    // Bonus for inflicting status on an enemy without one
    if (move.statusEffect && (!opponentResonator.statusEffects || opponentResonator.statusEffects.length === 0)) {
      score += 35;
    }

    if (score > highestScore) {
      highestScore = score;
      bestIdx = idx;
    }
  });

  return { type: "move", moveIdx: bestIdx };
}

/**
 * Smart AI replacement selection when active resonator faints.
 * Prefers living resonator with elemental advantage, then highest HP.
 */
export function chooseAiFaintReplacement(
  aiTrainer: BattleTrainer,
  opponentResonator: BattleResonator
): number {
  const livingIndices = aiTrainer.team
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => !r.isFainted);

  if (livingIndices.length === 0) return 0;
  if (livingIndices.length === 1) return livingIndices[0].idx;

  // 1. Look for living resonator with elemental advantage (> 1.0)
  const advantageous = livingIndices.filter(
    ({ r }) => getTypeMatchup(r.element, opponentResonator.element).multiplier > 1.0
  );
  if (advantageous.length > 0) {
    advantageous.sort((a, b) => b.r.hp - a.r.hp);
    return advantageous[0].idx;
  }

  // 2. Otherwise pick living resonator with highest HP
  livingIndices.sort((a, b) => b.r.hp - a.r.hp);
  return livingIndices[0].idx;
}

// =========================================================================
// 3v3 HSR + DELUGE COMBAT ENGINE
// =========================================================================

export const BASE_ACTION_VALUE = 10000;

export function calculateActionValue(spd: number): number {
  return Math.max(1, Math.round(BASE_ACTION_VALUE / Math.max(1, spd)));
}

/**
 * Initializes the Action Value timeline for all living active frontline units.
 */
export function createActionTimeline(
  playerTrainer: BattleTrainer,
  opponentTrainer: BattleTrainer
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  const pActiveIndices = playerTrainer.activeIndices ?? [0, 1, 2].slice(0, playerTrainer.team.length);
  pActiveIndices.forEach((teamIdx, slotIdx) => {
    const unit = playerTrainer.team[teamIdx];
    if (unit && !unit.isFainted) {
      entries.push({
        id: `p_${unit.id}_${slotIdx}_${Math.random().toString(36).slice(2, 6)}`,
        trainerId: playerTrainer.id,
        isPlayer: true,
        teamIndex: teamIdx,
        slotIndex: slotIdx,
        actionValue: calculateActionValue(unit.spd),
        speed: unit.spd,
      });
    }
  });

  const oActiveIndices = opponentTrainer.activeIndices ?? [0, 1, 2].slice(0, opponentTrainer.team.length);
  oActiveIndices.forEach((teamIdx, slotIdx) => {
    const unit = opponentTrainer.team[teamIdx];
    if (unit && !unit.isFainted) {
      entries.push({
        id: `o_${unit.id}_${slotIdx}_${Math.random().toString(36).slice(2, 6)}`,
        trainerId: opponentTrainer.id,
        isPlayer: false,
        teamIndex: teamIdx,
        slotIndex: slotIdx,
        actionValue: calculateActionValue(unit.spd),
        speed: unit.spd,
      });
    }
  });

  entries.sort((a, b) => a.actionValue - b.actionValue);
  return entries;
}

/**
 * Advances the timeline: finds lowest AV, deducts it from all units,
 * pops the acting unit, resets its AV based on speed, and re-sorts.
 */
export function advanceTimeline(
  timeline: TimelineEntry[],
  avDelayMultiplier: number = 1.0
): { nextUnit: TimelineEntry; updatedTimeline: TimelineEntry[] } | null {
  if (timeline.length === 0) return null;

  const list = timeline.map((e) => ({ ...e }));

  // Check if first entry is an ultimate interrupt
  if (list[0].isInterrupt) {
    const nextUnit = list.shift()!;
    return { nextUnit, updatedTimeline: list };
  }

  // 1. Shift the currently acting unit out of the timeline
  const actingUnit = list.shift()!;

  // 2. Reinsert the acting unit with standard AV based on its speed
  const standardAv = calculateActionValue(actingUnit.speed);
  const reinserted: TimelineEntry = {
    ...actingUnit,
    actionValue: Math.max(1, Math.round(standardAv * avDelayMultiplier)),
    isInterrupt: false,
  };
  list.push(reinserted);

  // 3. Sort by current action value
  list.sort((a, b) => a.actionValue - b.actionValue);

  // 4. Fair turn anti-monopoly safeguard:
  // If the same unit that just completed a turn is still at index 0 without an extra turn,
  // ensure living opposing units get their turn before this unit acts again consecutively.
  const hasOpposingUnit = list.some((e) => e.isPlayer !== actingUnit.isPlayer);
  if (hasOpposingUnit && list[0].isPlayer === actingUnit.isPlayer && list[0].teamIndex === actingUnit.teamIndex) {
    const firstOppIdx = list.findIndex((e) => e.isPlayer !== actingUnit.isPlayer);
    if (firstOppIdx !== -1) {
      const oppAv = list[firstOppIdx].actionValue;
      const actingUnitEntry = list.shift()!;
      actingUnitEntry.actionValue = oppAv + 1;
      list.push(actingUnitEntry);
      list.sort((a, b) => a.actionValue - b.actionValue);
    }
  }

  // 5. Advance time: deduct the lowest action value from all units so the next unit reaches 0 AV!
  const timeDelta = list[0].actionValue;
  if (timeDelta > 0) {
    for (const entry of list) {
      entry.actionValue = Math.max(0, entry.actionValue - timeDelta);
    }
  }

  const nextUnit = list[0];
  return { nextUnit, updatedTimeline: list };
}

/**
 * Inserts an Ultimate Interrupt at the very front of the timeline.
 */
export function insertUltimateInterrupt(
  timeline: TimelineEntry[],
  trainer: BattleTrainer,
  teamIndex: number,
  slotIndex: number,
  isPlayer: boolean
): TimelineEntry[] {
  const unit = trainer.team[teamIndex];
  if (!unit || unit.isFainted) return timeline;

  const interruptEntry: TimelineEntry = {
    id: `ult_${unit.id}_${Date.now()}`,
    trainerId: trainer.id,
    isPlayer,
    teamIndex,
    slotIndex,
    actionValue: 0,
    speed: unit.spd,
    isInterrupt: true,
  };

  return [interruptEntry, ...timeline];
}

/**
 * Removes a fainted unit from the timeline.
 */
export function removeUnitFromTimeline(
  timeline: TimelineEntry[],
  isPlayer: boolean,
  teamIndex: number
): TimelineEntry[] {
  return timeline.filter((e) => !(e.isPlayer === isPlayer && e.teamIndex === teamIndex));
}

/**
 * Adds a freshly deployed bench unit to the timeline.
 * Inherits the downed unit's action value so enemies/allies do not lose their turn position,
 * preventing unfair infinite turn chaining.
 */
export function addUnitToTimeline(
  timeline: TimelineEntry[],
  trainer: BattleTrainer,
  teamIndex: number,
  slotIndex: number,
  isPlayer: boolean,
  inheritActionValue?: number
): TimelineEntry[] {
  const unit = trainer.team[teamIndex];
  if (!unit || unit.isFainted) return timeline;

  // Filter out any existing entries for this unit so duplicates never occur
  const filtered = timeline.filter((e) => !(e.isPlayer === isPlayer && e.teamIndex === teamIndex));

  const standardAv = calculateActionValue(unit.spd);
  let resolvedAv = standardAv;

  if (inheritActionValue !== undefined && inheritActionValue >= 0) {
    resolvedAv = Math.min(inheritActionValue, standardAv);
  } else if (filtered.length > 0) {
    // Fair turn positioning if no inherited AV: place mid-queue so the replacement isn't starved
    const minExisting = filtered[0].actionValue;
    const maxExisting = filtered[filtered.length - 1].actionValue;
    resolvedAv = Math.min(standardAv, Math.max(minExisting + 4, Math.round((minExisting + maxExisting) / 2)));
  }

  const newEntry: TimelineEntry = {
    id: `sub_${unit.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    trainerId: trainer.id,
    isPlayer,
    teamIndex,
    slotIndex,
    actionValue: resolvedAv,
    speed: unit.spd,
  };

  const list = [...filtered, newEntry];
  list.sort((a, b) => a.actionValue - b.actionValue);
  return list;
}

export interface MultiTargetResult {
  primaryTargetIndex: number;
  primaryTargetSlot: number;
  results: Array<{
    defenderTeamIndex: number;
    defenderSlot: number;
    damageResult: TurnDamageResult;
  }>;
  allyEffects?: Array<{
    allyTeamIndex: number;
    allySlot: number;
    healAmount: number;
    barrierAmount: number;
  }>;
  batteryTeammateIndex?: number;
  batteryAmount?: number;
  followUpZap?: {
    damageResult: TurnDamageResult;
    targetTeamIndex: number;
    targetSlot: number;
  };
  logs: string[];
}

/**
 * Resolves an action with targeting scope (single, blast, aoe, ally_single, ally_team).
 */
export function execute3v3Action(
  attacker: BattleResonator,
  attackerTeamIndex: number,
  attackerSlot: number,
  move: BattleMove,
  isAttackerPlayer: boolean,
  playerTrainer: BattleTrainer,
  opponentTrainer: BattleTrainer,
  targetSlot: number,
  options?: {
    activeBlessings?: import("./types").TowerBlessing[];
    isBossFight?: boolean;
    isOneMoreTurn?: boolean;
  }
): MultiTargetResult {
  const logs: string[] = [];
  const actingTrainer = isAttackerPlayer ? playerTrainer : opponentTrainer;
  const defendingTrainer = isAttackerPlayer ? opponentTrainer : playerTrainer;

  const defendingActiveIndices = defendingTrainer.activeIndices ?? [0, 1, 2].slice(0, defendingTrainer.team.length);
  const actingActiveIndices = actingTrainer.activeIndices ?? [0, 1, 2].slice(0, actingTrainer.team.length);

  const scope = move.targetScope ?? "single";
  const results: MultiTargetResult["results"] = [];
  const allyEffects: MultiTargetResult["allyEffects"] = [];

  // =========================================================================
  // 1. ALLY BUFF / HEAL SCOPES
  // =========================================================================
  if (scope === "ally_single" || scope === "ally_team" || scope === "self") {
    const slotsToAffect =
      scope === "self"
        ? [attackerSlot]
        : scope === "ally_single"
        ? [targetSlot]
        : actingActiveIndices.map((_, i) => i);

    for (const slotIdx of slotsToAffect) {
      const teamIdx = actingActiveIndices[slotIdx];
      if (teamIdx !== undefined) {
        const ally = actingTrainer.team[teamIdx];
        if (ally && !ally.isFainted) {
          let healAmount = 0;
          let barrierAmount = 0;

          if (move.healPercent) {
            healAmount = Math.round(ally.maxHp * (move.healPercent / 100));
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
          }
          if (move.teamHealPercent && scope === "ally_team") {
            const teamHeal = Math.round(ally.maxHp * (move.teamHealPercent / 100));
            healAmount += teamHeal;
            ally.hp = Math.min(ally.maxHp, ally.hp + teamHeal);
          }
          if (move.barrierPercent) {
            barrierAmount = Math.round(ally.maxHp * (move.barrierPercent / 100));
            ally.barrierHp = Math.min(Math.round(ally.maxHp * 0.4), (ally.barrierHp || 0) + barrierAmount);
          }
          if (move.teamBarrierPercent && scope === "ally_team") {
            const teamBarrier = Math.round(ally.maxHp * (move.teamBarrierPercent / 100));
            barrierAmount += teamBarrier;
            ally.barrierHp = Math.min(Math.round(ally.maxHp * 0.4), (ally.barrierHp || 0) + teamBarrier);
          }
          if (move.cleanseDebuffs) {
            ally.statusEffects = (ally.statusEffects || []).filter(
              (s) => s.type.startsWith("buff_")
            );
            logs.push(`✨ ${ally.name} cleansed of all negative debuffs!`);
          }

          allyEffects.push({
            allyTeamIndex: teamIdx,
            allySlot: slotIdx,
            healAmount,
            barrierAmount,
          });

          if (healAmount > 0) {
            logs.push(`💚 ${ally.name} restored +${healAmount} HP!`);
          }
          if (barrierAmount > 0) {
            logs.push(`🛡️ ${ally.name} gained a +${barrierAmount} Energy Barrier!`);
          }
        }
      }
    }

    attacker.energy = Math.min(100, (attacker.energy || 0) + (move.energyGain || 20));
    if (move.energyCost) {
      attacker.energy = Math.max(0, attacker.energy - move.energyCost);
    }

    return {
      primaryTargetIndex: actingActiveIndices[targetSlot] ?? attackerTeamIndex,
      primaryTargetSlot: targetSlot,
      results: [],
      allyEffects,
      logs,
    };
  }

  // =========================================================================
  // 2. OFFENSIVE SCOPES (single, blast, aoe)
  // =========================================================================
  // Validate and redirect primary target FIRST so blast/single scopes target living units
  let primaryTeamIdx = defendingActiveIndices[targetSlot];
  if (
    primaryTeamIdx === undefined ||
    defendingTrainer.team[primaryTeamIdx]?.isFainted ||
    (defendingTrainer.team[primaryTeamIdx]?.hp ?? 0) <= 0
  ) {
    const livingSlot = defendingActiveIndices.findIndex(
      (idx) => idx !== undefined && !defendingTrainer.team[idx]?.isFainted && (defendingTrainer.team[idx]?.hp ?? 0) > 0
    );
    if (livingSlot !== -1) {
      targetSlot = livingSlot;
      primaryTeamIdx = defendingActiveIndices[livingSlot];
    }
  }

  let targetedSlots: Array<{ slot: number; powerMult: number }> = [];

  if (scope === "single") {
    targetedSlots = [{ slot: targetSlot, powerMult: 1.0 }];
  } else if (scope === "blast") {
    targetedSlots.push({ slot: targetSlot, powerMult: 1.0 });
    if (targetSlot - 1 >= 0) {
      targetedSlots.push({ slot: targetSlot - 1, powerMult: 0.5 });
    }
    if (targetSlot + 1 < defendingActiveIndices.length) {
      targetedSlots.push({ slot: targetSlot + 1, powerMult: 0.5 });
    }
  } else if (scope === "aoe") {
    defendingActiveIndices.forEach((_, sIdx) => {
      targetedSlots.push({ slot: sIdx, powerMult: 0.75 });
    });
  }

  for (const { slot, powerMult } of targetedSlots) {
    const teamIdx = defendingActiveIndices[slot];
    if (teamIdx === undefined) continue;
    const defender = defendingTrainer.team[teamIdx];
    if (!defender || defender.isFainted) continue;

    const scaledMove: BattleMove = {
      ...move,
      power: Math.round(move.power * powerMult),
    };

    const dmgRes = executeMoveDamage(
      attacker,
      defender,
      scaledMove,
      options?.isOneMoreTurn ?? false,
      options
    );

    if (defender.hp <= 0 || defender.isFainted) {
      defender.isFainted = true;
      dmgRes.defenderFainted = true;
      logs.push(`💀 ${defender.name} has been downed!`);
    }

    results.push({
      defenderTeamIndex: teamIdx,
      defenderSlot: slot,
      damageResult: dmgRes,
    });

    if (dmgRes.logs) {
      logs.push(...dmgRes.logs);
    }
  }

  if (move.category === "liberation") {
    attacker.energy = 0;
  } else {
    const gain = move.energyGain || (move.category === "basic" ? 20 : 30);
    attacker.energy = Math.min(100, (attacker.energy || 0) + gain);
  }
  if (move.energyCost && move.category !== "liberation") {
    attacker.energy = Math.max(0, attacker.energy - move.energyCost);
  }

  // Zhezhi Battery Synergy:
  let batteryTeammateIndex: number | undefined;
  let batteryAmount: number | undefined;
  if (attacker.id === "zhezhi") {
    let lowestEnergy = 101;
    let lowestIdx: number | undefined;
    actingActiveIndices.forEach((tIdx) => {
      const ally = actingTrainer.team[tIdx];
      if (ally && !ally.isFainted && ally.id !== "zhezhi") {
        if ((ally.energy || 0) < lowestEnergy) {
          lowestEnergy = ally.energy || 0;
          lowestIdx = tIdx;
        }
      }
    });
    if (lowestIdx !== undefined) {
      const recipient = actingTrainer.team[lowestIdx];
      recipient.energy = Math.min(100, (recipient.energy || 0) + 35);
      batteryTeammateIndex = lowestIdx;
      batteryAmount = 35;
      logs.push(`⚡ Zhezhi's Ink Spirits charged ${recipient.name} with +35 Resonance Energy!`);
    }
  }

  // Yinlin Zapstring Coordinated Strike:
  let followUpZap: MultiTargetResult["followUpZap"];
  const hasYinlin = actingActiveIndices.some((tIdx) => {
    const u = actingTrainer.team[tIdx];
    return u && !u.isFainted && u.id === "yinlin";
  });
  if (hasYinlin && attacker.id !== "yinlin") {
    const primaryDef = defendingTrainer.team[primaryTeamIdx];
    if (primaryDef && !primaryDef.isFainted && primaryDef.statusEffects?.some((s) => s.type === "shock")) {
      const zapDmg = Math.round((attacker.atk * 0.45));
      primaryDef.hp = Math.max(0, primaryDef.hp - zapDmg);
      const zapRes: TurnDamageResult = {
        damage: zapDmg,
        isCrit: Math.random() < 0.35,
        typeMultiplier: 1.0,
        typeEffectiveness: "super",
        defenderFainted: primaryDef.hp <= 0,
        triggeredOneMore: false,
        knockedDown: false,
      };
      if (primaryDef.hp <= 0) {
        primaryDef.isFainted = true;
        logs.push(`⚡ Zapstring: Coordinated Strike executed ${primaryDef.name}!`);
      } else {
        logs.push(`⚡ Zapstring: Coordinated Strike struck ${primaryDef.name} for ${zapDmg} Electro DMG!`);
      }
      followUpZap = {
        damageResult: zapRes,
        targetTeamIndex: primaryTeamIdx,
        targetSlot,
      };
    }
  }

  return {
    primaryTargetIndex: primaryTeamIdx,
    primaryTargetSlot: targetSlot,
    results,
    allyEffects,
    batteryTeammateIndex,
    batteryAmount,
    followUpZap,
    logs,
  };
}

/**
 * Deploys a reserve resonator from bench to a frontline slot.
 */
export function deployReserveResonator(
  trainer: BattleTrainer,
  slotIndex: number,
  reserveTeamIndex: number
): BattleTrainer {
  if (!trainer.activeIndices) {
    trainer.activeIndices = [0, 1, 2].slice(0, trainer.team.length);
  }
  trainer.activeIndices[slotIndex] = reserveTeamIndex;

  // Auto-redirect activeIdx if the current active resonator is fainted or missing
  const currentActive = trainer.team[trainer.activeIdx];
  if (!currentActive || currentActive.isFainted || currentActive.hp <= 0) {
    trainer.activeIdx = reserveTeamIndex;
  }
  return trainer;
}

/**
 * Checks if entire 6-unit team is wiped out (all fainted or 0 HP).
 */
export function isTeamWiped(trainer: BattleTrainer): boolean {
  return trainer.team.every((r) => r.isFainted || r.hp <= 0);
}
