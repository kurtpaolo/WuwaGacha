"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Coins,
  Sparkles,
  Flame,
  RotateCcw,
  Trophy,
  Dices,
  Disc,
  CircleDot,
  Ticket,
  Shield,
  Layers,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";
import { AstriteIcon } from "@/components/ui/GameIcons";

export type MinigameId = "coinflip" | "slots" | "blackjack" | "dice" | "roulette" | "wheel" | "scratch";

interface PlazaMinigamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: MinigameId;
  lockedGame?: MinigameId;
  astriteBalance: number;
  onUpdateAstrites: (delta: number) => number;
}

// ----------------------------------------------------------------------------
// MATHEMATICAL INTEGRITY & CRYPTO RNG (Strict 95% RTP Target)
// ----------------------------------------------------------------------------
export const TARGET_RTP = 0.95; // 95.00% Return-to-Player / 5.00% House Edge

export function getCryptoRandomFloat(): number {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] / (0xffffffff + 1);
  }
  return Math.random();
}

export function getCryptoRandomInt(min: number, max: number): number {
  return Math.floor(getCryptoRandomFloat() * (max - min + 1)) + min;
}

// ----------------------------------------------------------------------------
// GAME CONFIG & HOSTS
// ----------------------------------------------------------------------------
export const MINIGAME_HOSTS: Record<
  MinigameId,
  { name: string; title: string; tag: string }
> = {
  coinflip: {
    name: "Brant",
    title: "Double or Nothing",
    tag: "2.0x Flip",
  },
  slots: {
    name: "Carlotta",
    title: "Echo Slots",
    tag: "Slots",
  },
  blackjack: {
    name: "Yinlin",
    title: "Tacet 21",
    tag: "3:2 Blackjack",
  },
  dice: {
    name: "Cantarella",
    title: "European Roulette",
    tag: "36x Roulette",
  },
  roulette: {
    name: "Cantarella",
    title: "European Roulette",
    tag: "36x Roulette",
  },
  wheel: {
    name: "Phoebe",
    title: "Color Game",
    tag: "Color Game",
  },
  scratch: {
    name: "Lupa",
    title: "Mystery Scratchcards",
    tag: "5x5 4-Strike",
  },
};

export const MAX_BET_LIMIT = 250000; // 250,000 Astrites limit per bet on every minigame
const BET_PRESETS = [100, 500, 1000];

// ============================================================================
// INSUFFICIENT ASTRITES ALERT MODAL
// ============================================================================
interface InsufficientAlertProps {
  needed: number;
  current: number;
  onClose: () => void;
}

const InsufficientAlertModal: React.FC<InsufficientAlertProps> = ({ needed, current, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: "transform, opacity" }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-[#140b0e] border-2 border-rose-500/80 p-5 shadow-2xl flex flex-col items-center text-center space-y-3.5"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-rose-300 flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black font-mono text-rose-300 uppercase tracking-wider">
              Not Enough Astrites!
            </h3>
            <p className="text-xs font-mono text-gray-300 leading-relaxed">
              You need <strong className="text-yellow-300">{needed.toLocaleString()} ✦</strong> to place this bet, but you only have <strong className="text-rose-400">{current.toLocaleString()} ✦</strong>.
            </p>
          </div>

          <div className="w-full p-2.5 rounded-xl bg-black/50 border border-white/10 text-[11px] font-mono text-gray-400">
            Tip: Lower your wager or claim free Astrites from the bank in the top bar!
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// UNIVERSAL BET SELECTOR (100, 500, 1000, CUSTOM)
// ============================================================================
interface BetSelectorProps {
  bet: number;
  setBet: (val: number) => void;
  disabled?: boolean;
  astriteBalance: number;
  onInsufficient?: (needed: number) => void;
}

const BetSelector: React.FC<BetSelectorProps> = ({
  bet,
  setBet,
  disabled,
  astriteBalance,
  onInsufficient,
}) => {
  const [isCustom, setIsCustom] = useState(() => ![100, 500, 1000].includes(bet));
  const [customText, setCustomText] = useState(() => (![100, 500, 1000].includes(bet) ? bet.toString() : ""));

  const handlePreset = (amt: number) => {
    const capped = Math.min(amt, MAX_BET_LIMIT);
    if (capped > astriteBalance) {
      soundEngine.playInsufficient();
      onInsufficient?.(capped);
      return;
    }
    soundEngine.playClick();
    setIsCustom(false);
    setBet(capped);
  };

  const handleCustomInput = (val: string) => {
    const cleanDigits = val.replace(/\D/g, "");
    setCustomText(cleanDigits);
    const parsed = parseInt(cleanDigits, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setBet(Math.min(parsed, astriteBalance, MAX_BET_LIMIT));
    }
  };

  const handleCustomBlur = () => {
    const parsed = parseInt(customText.replace(/\D/g, ""), 10);
    if (!isNaN(parsed)) {
      if (parsed > MAX_BET_LIMIT) {
        const clamped = Math.min(MAX_BET_LIMIT, astriteBalance);
        setCustomText(clamped.toString());
        setBet(clamped);
      } else if (parsed > astriteBalance) {
        setCustomText(astriteBalance.toString());
        setBet(astriteBalance);
      }
    }
  };

  const isExceedingCap = parseInt(customText.replace(/\D/g, ""), 10) > MAX_BET_LIMIT;

  return (
    <div className="space-y-2 w-full pt-1">
      <div className="flex items-center justify-between text-xs font-mono text-gray-400">
        <span className="flex items-center space-x-1.5">
          <span>Choose Bet:</span>
          <span className="text-[9.5px] font-mono font-bold text-amber-300/80 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
            MAX 250k
          </span>
        </span>
        <span className="font-bold text-white flex items-center space-x-1">
          <span>{bet.toLocaleString()} Astrites</span>
          <AstriteIcon className="w-3.5 h-3.5 inline ml-1" />
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {BET_PRESETS.map((amt) => {
          const isSelected = !isCustom && bet === amt;
          return (
            <button
              key={amt}
              type="button"
              disabled={disabled}
              onClick={() => handlePreset(amt)}
              className={`flex-1 min-w-[65px] py-1.5 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? "bg-yellow-400/25 border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.25)] scale-102"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {amt.toLocaleString()}
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            soundEngine.playClick();
            setIsCustom(true);
            setCustomText(bet.toString());
          }}
          className={`flex-1 min-w-[65px] py-1.5 rounded-lg border font-mono text-xs font-bold transition-all cursor-pointer ${
            isCustom
              ? "bg-amber-400/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)] scale-102"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="space-y-1 pt-1 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                disabled={disabled}
                value={customText}
                placeholder="Enter bet amount (Max 250,000)..."
                onChange={(e) => handleCustomInput(e.target.value)}
                onBlur={handleCustomBlur}
                className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-amber-400/60 text-white font-mono text-xs focus:outline-none focus:border-amber-400 shadow-inner"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-500">
                ✦
              </span>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (astriteBalance <= 0) {
                  soundEngine.playInsufficient();
                  onInsufficient?.(100);
                  return;
                }
                soundEngine.playClick();
                const maxBet = Math.min(astriteBalance, MAX_BET_LIMIT);
                setCustomText(maxBet.toString());
                setBet(maxBet);
              }}
              className="px-3 py-1.5 rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-mono text-xs font-bold transition-all cursor-pointer"
              title="Max Bet (up to 250,000 Astrites)"
            >
              MAX
            </button>
          </div>
          {isExceedingCap && (
            <div className="text-[10px] font-mono text-amber-400 text-left pl-1">
              Bet limit is 250,000 ✦. Wager capped to max.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// UNIVERSAL HIGH-IMPACT OUTCOME MODAL
// ============================================================================
export interface MinigameOutcomeData {
  type: "win" | "loss" | "push";
  title: string;
  landedTitle: string;
  landedValue: string;
  landedIcon?: string;
  landedColor?: string;
  landedSub?: string;
  betTitle: string;
  betValue: string;
  betSub?: string;
  deltaAmount: number;
  multiplier?: string;
}

interface OutcomeModalProps {
  outcome: MinigameOutcomeData | null;
  onPlayAgain: () => void;
  onClose: () => void;
}

const MinigameOutcomeModal: React.FC<OutcomeModalProps> = ({ outcome, onPlayAgain, onClose }) => {
  return (
    <AnimatePresence>
      {outcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute inset-0 z-50 bg-black/85 flex items-center justify-center p-3 select-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 6, opacity: 0 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-5 border-2 shadow-2xl flex flex-col items-center text-center space-y-4 ${
              outcome.type === "win"
                ? "bg-[#0a1811] border-emerald-400 shadow-[0_4px_24px_rgba(16,185,129,0.35)]"
                : outcome.type === "loss"
                ? "bg-[#180a0f] border-rose-500 shadow-[0_4px_24px_rgba(244,63,94,0.3)]"
                : "bg-[#161208] border-amber-400 shadow-[0_4px_24px_rgba(245,158,11,0.25)]"
            }`}
          >
            {/* Status Header Badge */}
            <div className="flex flex-col items-center space-y-1">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 shadow-lg ${
                  outcome.type === "win"
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    : outcome.type === "loss"
                    ? "bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                    : "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                }`}
              >
                {outcome.type === "win" ? "🏆" : outcome.type === "loss" ? "💥" : "🤝"}
              </div>
              <h3
                className={`text-lg sm:text-xl font-black font-mono tracking-wider uppercase ${
                  outcome.type === "win"
                    ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    : outcome.type === "loss"
                    ? "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                    : "text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                }`}
              >
                {outcome.type === "win" ? "WIN!" : outcome.type === "loss" ? "LOSE" : "REFUND"}
              </h3>
              {outcome.multiplier && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-yellow-400 text-black shadow">
                  {outcome.multiplier}
                </span>
              )}
            </div>

            {/* Large Amount Display */}
            <div
              className={`w-full py-3 px-4 rounded-xl border font-mono font-black flex items-center justify-center text-2xl sm:text-3xl ${
                outcome.deltaAmount > 0
                  ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                  : outcome.deltaAmount < 0
                  ? "bg-rose-500/15 border-rose-400/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                  : "bg-white/5 border-white/10 text-gray-300"
              }`}
            >
              <span>
                {outcome.deltaAmount > 0
                  ? `+${outcome.deltaAmount.toLocaleString()}`
                  : outcome.deltaAmount < 0
                  ? `-${Math.abs(outcome.deltaAmount).toLocaleString()}`
                  : "0"}
              </span>
              <AstriteIcon className="w-6 h-6 ml-2 inline" />
            </div>

            {/* Clean Result Row */}
            <div className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-gray-300">
              <div className="flex items-center space-x-1.5">
                {outcome.landedIcon && <span>{outcome.landedIcon}</span>}
                <span style={{ color: outcome.landedColor || "#ffffff" }} className="font-bold">
                  {outcome.landedValue}
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Bet: <strong className="text-white">{outcome.betValue}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full pt-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onPlayAgain();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all hover:scale-102 active:scale-95 cursor-pointer"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-mono font-bold text-xs uppercase transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN MODAL CONTAINER
// ============================================================================
export const PlazaMinigamesModal = React.memo<PlazaMinigamesModalProps>(({
  isOpen,
  onClose,
  initialGame = "coinflip",
  lockedGame,
  astriteBalance,
  onUpdateAstrites,
}) => {
  const effectiveGame = lockedGame || initialGame || "coinflip";
  const [activeGame, setActiveGame] = useState<MinigameId>(effectiveGame);

  useEffect(() => {
    if (lockedGame) {
      setActiveGame(lockedGame);
    } else if (initialGame) {
      setActiveGame(initialGame);
    }
  }, [lockedGame, initialGame]);

  const currentHost = MINIGAME_HOSTS[activeGame];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/90 select-none overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: "transform, opacity" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92dvh] bg-[#0b0f1a] border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto relative"
          >
        {/* Modal Top Bar (Just NPC Name, No Subtitle) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-amber-500/20 bg-[#080c14] flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wider">
                  {currentHost.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-yellow-300 border border-amber-400/40">
                  {currentHost.title}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Astrite Balance Display */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-black/40 border border-amber-400/30 shadow-inner">
              <AstriteIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-mono font-bold text-yellow-300">
                {astriteBalance.toLocaleString()}
              </span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector: Only rendered if NOT locked to a specific NPC */}
        {!lockedGame && (
          <div className="flex items-center space-x-1 px-3 py-2 border-b border-white/5 bg-[#070a12] overflow-x-auto flex-shrink-0 no-scrollbar">
            {(
              [
                { id: "coinflip", label: "Brant", icon: Coins },
                { id: "slots", label: "Carlotta", icon: Sparkles },
                { id: "blackjack", label: "Yinlin", icon: Layers },
                { id: "roulette", label: "Cantarella", icon: Disc },
                { id: "wheel", label: "Phoebe", icon: CircleDot },
                { id: "scratch", label: "Lupa", icon: Ticket },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isSelected = activeGame === t.id || (t.id === "roulette" && activeGame === "dice");
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveGame(t.id);
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 text-yellow-300 border border-amber-400/50 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Game View Container */}
        <div className="p-3 sm:p-5 flex-1 min-h-0 overflow-y-auto relative">
          {activeGame === "coinflip" && (
            <CoinflipGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
          )}
          {activeGame === "slots" && (
            <SlotsGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
          )}
          {activeGame === "blackjack" && (
            <BlackjackGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
          )}
          {(activeGame === "roulette" || activeGame === "dice") && (
            <RouletteGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
          )}
          {activeGame === "wheel" && (
            <WheelGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
          )}
          {activeGame === "scratch" && (
            <ScratchcardGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// SUB-GAME 1: ASTRITE COINFLIP - Brant
// Fixed Tails Side, 0 Mirrored Bleed, No 2.0x Text, 750ms Suspense Delay
// ============================================================================
interface GameCommonProps {
  astriteBalance: number;
  onUpdateAstrites: (delta: number) => number;
}

const CoinflipGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState<number>(100);
  const [side, setSide] = useState<"heads" | "tails">("heads");
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotation, setRotation] = useState<number>(0);
  const [pendingOutcome, setPendingOutcome] = useState<"heads" | "tails" | null>(null);
  const [streak, setStreak] = useState(0);
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  const currentFacing = isFlipping ? null : (pendingOutcome || "heads");

  const handleStartFlip = () => {
    if (isFlipping) return;

    const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
    if (effectiveBet <= 0 || effectiveBet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(effectiveBet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-effectiveBet);
    setIsFlipping(true);
    setOutcomeModal(null);

    // Strictly 50% Heads, 50% Tails with cryptographic RNG
    const outcomeSide: "heads" | "tails" = getCryptoRandomFloat() < 0.5 ? "heads" : "tails";
    setPendingOutcome(outcomeSide);

    // Flip math:
    // Front face (0 deg) = HEADS
    // Back face (180 deg) = TAILS
    const baseRotation = Math.ceil(rotation / 360) * 360;
    const spins = 1800; // 5 full turns
    const target = baseRotation + spins + (outcomeSide === "tails" ? 180 : 0);
    setRotation(target);
  };

  const handleFlipAnimationComplete = () => {
    if (!isFlipping || !pendingOutcome) return;
    setIsFlipping(false);

    // 400ms suspense delay so user sees the landed coin before the popup appears
    setTimeout(() => {
      const won = pendingOutcome === side;
      const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
      if (won) {
        // True Double or Nothing (2.0x gross payout)
        const payout = effectiveBet * 2;
        onUpdateAstrites(payout);
        setStreak((s) => s + 1);
        soundEngine.playAstriteGain();
        setOutcomeModal({
          type: "win",
          title: "VICTORY! 2.0x WIN",
          landedTitle: "Coin Landed On",
          landedValue: pendingOutcome.toUpperCase(),
          landedIcon: pendingOutcome === "heads" ? "🪙" : "🛡️",
          landedColor: pendingOutcome === "heads" ? "#facc15" : "#c084fc",
          betTitle: "Your Call",
          betValue: `${side.toUpperCase()} (${effectiveBet.toLocaleString()} ✦)`,
          deltaAmount: payout,
          multiplier: "2.0x Payout",
        });
      } else {
        setStreak(0);
        soundEngine.playMissWhoosh();
        setOutcomeModal({
          type: "loss",
          title: "DEFEAT! MISSED FLIP",
          landedTitle: "Coin Landed On",
          landedValue: pendingOutcome.toUpperCase(),
          landedIcon: pendingOutcome === "heads" ? "🪙" : "🛡️",
          landedColor: pendingOutcome === "heads" ? "#facc15" : "#c084fc",
          betTitle: "Your Call",
          betValue: `${side.toUpperCase()} (${effectiveBet.toLocaleString()} ✦)`,
          deltaAmount: -effectiveBet,
        });
      }
    }, 400);
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative">
      {/* Brant Greeting Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Brant:</strong> "Heads or Tails, Rover? Double up or lose it all!"
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 font-bold ml-2">
          <span className="text-gray-400">Streak:</span>
          <span className="text-yellow-300 flex items-center">
            {streak > 0 && <Flame className="w-3.5 h-3.5 text-orange-400 mr-0.5" />}
            {streak}
          </span>
        </div>
      </div>

      {/* 3D Double-Sided Coin Stage */}
      <div className="py-4 flex flex-col items-center justify-center [perspective:1200px]">
        {/* Flight & altitude motion wrapper (Pure 2D Y/scale jump, eliminates matrix3d compositing bottleneck) */}
        <motion.div
          animate={{
            y: isFlipping ? [0, -85, -40, 0] : 0,
            scale: isFlipping ? [1, 1.12, 1.04, 1] : 1,
          }}
          transition={{
            duration: 1.3,
            ease: [0.15, 0.85, 0.25, 1],
          }}
          className="relative flex flex-col items-center justify-center"
        >
          {/* 3D Spinning Coin (Pure rotateY, NO filters to prevent 3D flattening) */}
          <motion.div
            animate={{
              rotateY: rotation,
            }}
            transition={{
              duration: 1.3,
              ease: [0.15, 0.85, 0.25, 1],
            }}
            onAnimationComplete={handleFlipAnimationComplete}
            style={{
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d",
              willChange: "transform",
            }}
            className="relative w-36 h-36 rounded-full cursor-pointer select-none"
          >
            {/* FRONT FACE: HEADS (Gold Plate, completely hidden when landed on Tails) */}
            <div
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg) translateZ(1px)",
                display: currentFacing === "tails" ? "none" : "flex",
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 border-4 border-yellow-200 shadow-[0_0_35px_rgba(250,204,21,0.5)] flex flex-col items-center justify-center text-black p-3"
            >
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-amber-950/40 flex flex-col items-center justify-center bg-yellow-400/30">
                <Coins className="w-9 h-9 text-black mb-1 drop-shadow" />
                <span className="font-mono font-black text-xl tracking-widest uppercase">HEADS</span>
              </div>
            </div>

            {/* BACK FACE: TAILS (Vibrant Royal Purple Plate, completely hidden when landed on Heads) */}
            <div
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg) translateZ(1px)",
                display: currentFacing === "heads" ? "none" : "flex",
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900 border-4 border-purple-300 shadow-[0_0_35px_rgba(168,85,247,0.6)] flex flex-col items-center justify-center text-purple-100 p-3"
            >
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-purple-300/40 flex flex-col items-center justify-center bg-purple-900/40">
                <Shield className="w-9 h-9 text-purple-200 mb-1 drop-shadow" />
                <span className="font-mono font-black text-xl tracking-widest uppercase text-white">
                  TAILS
                </span>
              </div>
            </div>
          </motion.div>

          {/* Separate Dynamic Ground Shadow */}
          <motion.div
            animate={{
              scale: isFlipping ? [1, 0.5, 0.75, 1] : 1,
              opacity: isFlipping ? [0.6, 0.15, 0.35, 0.6] : 0.6,
            }}
            transition={{
              duration: 1.3,
              ease: [0.15, 0.85, 0.25, 1],
            }}
            className="w-24 h-3 bg-black/60 rounded-full blur-sm mt-3 pointer-events-none"
          />
        </motion.div>

        <div className="h-6 mt-1 flex items-center justify-center">
          {isFlipping ? (
            <span className="text-xs font-mono font-bold text-yellow-300 animate-pulse">
              🪙 Flipping in air...
            </span>
          ) : (
            <span className="text-xs font-mono text-gray-400">
              Predict Heads or Tails and place your wager
            </span>
          )}
        </div>
      </div>

      {/* Side Selector (Heads or Tails) */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          type="button"
          disabled={isFlipping}
          onClick={() => {
            soundEngine.playClick();
            setSide("heads");
          }}
          className={`py-3 px-4 rounded-xl font-mono font-bold text-sm transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            side === "heads"
              ? "bg-amber-500/25 border-amber-400 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.25)] scale-102"
              : "bg-black/30 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Coins className="w-4 h-4 text-amber-400" />
          <span>CALL HEADS (2.0x)</span>
        </button>

        <button
          type="button"
          disabled={isFlipping}
          onClick={() => {
            soundEngine.playClick();
            setSide("tails");
          }}
          className={`py-3 px-4 rounded-xl font-mono font-bold text-sm transition-all flex items-center justify-center space-x-2 border cursor-pointer ${
            side === "tails"
              ? "bg-purple-500/25 border-purple-400 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)] scale-102"
              : "bg-black/30 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Shield className="w-4 h-4 text-purple-400" />
          <span>CALL TAILS (2.0x)</span>
        </button>
      </div>

      {/* Universal Bet Selector */}
      <BetSelector
        bet={bet}
        setBet={setBet}
        disabled={isFlipping}
        astriteBalance={astriteBalance}
        onInsufficient={(needed) => setInsufficientNeeded(needed)}
      />

      {/* Big Flip Button */}
      <button
        type="button"
        disabled={isFlipping}
        onClick={handleStartFlip}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black uppercase text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:scale-101 active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
      >
        <Coins className="w-5 h-5" />
        <span>{isFlipping ? "FLIPPING..." : `FLIP COIN (${bet.toLocaleString()} ASTRITES)`}</span>
      </button>

      {/* Synchronized Result Modal */}
      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          handleStartFlip();
        }}
        onClose={() => setOutcomeModal(null)}
      />

      {/* Insufficient Warning */}
      {insufficientNeeded !== null && (
        <InsufficientAlertModal
          needed={insufficientNeeded}
          current={astriteBalance}
          onClose={() => setInsufficientNeeded(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-GAME 2: ECHO SLOTS - Carlotta
// Rapid Rolling Symbols, 2-Match Payouts, 1000ms Inspection Delay
// ============================================================================
const SLOT_SYMBOLS = [
  { id: "echo", symbol: "🍒", mult: 1, isRefund: true },
  { id: "energy", symbol: "⚡", mult: 2, isRefund: false },
  { id: "astrite", symbol: "💎", mult: 4, isRefund: false },
  { id: "boss", symbol: "👑", mult: 8, isRefund: false },
  { id: "star5", symbol: "⭐", mult: 20, isRefund: false },
  { id: "jackpot", symbol: "🌟", mult: 50, isRefund: false },
];

const SlotsGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState(["⭐", "⭐", "⭐"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  const handleSpin = () => {
    if (isSpinning) return;

    const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
    if (effectiveBet <= 0 || effectiveBet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(effectiveBet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-effectiveBet);
    setIsSpinning(true);
    setOutcomeModal(null);

    // Calibrated Casino Slots Odds (Exact 95.00% RTP, House Edge 5.00%):
    // 0.2% 🌟 Jackpot (50x Win, EV: 0.100)
    // 0.8% ⭐ 5-Star (20x Win, EV: 0.160)
    // 2.0% 👑 Crown (8x Win, EV: 0.160)
    // 4.5% 💎 Gem (4x Win, EV: 0.180)
    // 10.0% ⚡ Energy (2x Win, EV: 0.200)
    // 15.0% 🍒 Cherry (1.0x Refund / Break-Even, EV: 0.150)
    // 67.5% Loss (strictly NO 3-match, ~65% near-miss pairs)
    const roll = getCryptoRandomFloat();
    let final1: typeof SLOT_SYMBOLS[0];
    let final2: typeof SLOT_SYMBOLS[0];
    let final3: typeof SLOT_SYMBOLS[0];

    if (roll < 0.002) {
      final1 = SLOT_SYMBOLS[5];
      final2 = SLOT_SYMBOLS[5];
      final3 = SLOT_SYMBOLS[5];
    } else if (roll < 0.010) {
      final1 = SLOT_SYMBOLS[4];
      final2 = SLOT_SYMBOLS[4];
      final3 = SLOT_SYMBOLS[4];
    } else if (roll < 0.030) {
      final1 = SLOT_SYMBOLS[3];
      final2 = SLOT_SYMBOLS[3];
      final3 = SLOT_SYMBOLS[3];
    } else if (roll < 0.075) {
      final1 = SLOT_SYMBOLS[2];
      final2 = SLOT_SYMBOLS[2];
      final3 = SLOT_SYMBOLS[2];
    } else if (roll < 0.175) {
      final1 = SLOT_SYMBOLS[1];
      final2 = SLOT_SYMBOLS[1];
      final3 = SLOT_SYMBOLS[1];
    } else if (roll < 0.325) {
      final1 = SLOT_SYMBOLS[0];
      final2 = SLOT_SYMBOLS[0];
      final3 = SLOT_SYMBOLS[0];
    } else {
      // Loss: strictly NO 3-match! In 65% of losses, generate a near-miss pair for suspense
      const otherSymbols = [...SLOT_SYMBOLS];
      const pick1 = otherSymbols[Math.floor(getCryptoRandomFloat() * otherSymbols.length)];
      if (getCryptoRandomFloat() < 0.65) {
        const remaining = otherSymbols.filter((s) => s.id !== pick1.id);
        const pickDiff = remaining[Math.floor(getCryptoRandomFloat() * remaining.length)];
        const slotConfig = getCryptoRandomFloat();
        if (slotConfig < 0.33) {
          final1 = pick1;
          final2 = pick1;
          final3 = pickDiff;
        } else if (slotConfig < 0.66) {
          final1 = pick1;
          final2 = pickDiff;
          final3 = pick1;
        } else {
          final1 = pickDiff;
          final2 = pick1;
          final3 = pick1;
        }
      } else {
        const shuffled = [...otherSymbols].sort(() => 0.5 - getCryptoRandomFloat());
        final1 = shuffled[0];
        final2 = shuffled[1];
        final3 = shuffled[2];
      }
    }

    // Rapid symbol rolling interval
    let roll1Active = true;
    let roll2Active = true;
    let roll3Active = true;

    const intervalId = setInterval(() => {
      setReels((prev) => [
        roll1Active ? SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].symbol : prev[0],
        roll2Active ? SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].symbol : prev[1],
        roll3Active ? SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].symbol : prev[2],
      ]);
    }, 75);

    // Reel 1 lock at 900ms
    setTimeout(() => {
      roll1Active = false;
      setReels((prev) => [final1.symbol, prev[1], prev[2]]);
      soundEngine.playClick();
    }, 900);

    // Reel 2 lock at 1600ms
    setTimeout(() => {
      roll2Active = false;
      setReels((prev) => [final1.symbol, final2.symbol, prev[2]]);
      soundEngine.playClick();
    }, 1600);

    // Reel 3 lock at 2300ms
    setTimeout(() => {
      roll3Active = false;
      clearInterval(intervalId);
      setReels([final1.symbol, final2.symbol, final3.symbol]);
      setIsSpinning(false);
      soundEngine.playClick();

      // 450ms delay so player clearly inspects all 3 stopped reels before popup appears
      setTimeout(() => {
        // Payout Calculation: ONLY 3-of-a-kind pays!
        const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
        if (final1.id === final2.id && final2.id === final3.id) {
          const mult = final1.mult;
          if (final1.isRefund) {
            // Push / Refund: Get what you bet back!
            onUpdateAstrites(effectiveBet);
            soundEngine.playAstriteGain();
            setOutcomeModal({
              type: "push",
              title: "REFUND",
              landedTitle: "Result",
              landedValue: `${final1.symbol} ${final2.symbol} ${final3.symbol}`,
              betTitle: "Bet",
              betValue: `${effectiveBet.toLocaleString()} ✦`,
              deltaAmount: 0,
              multiplier: "1.0x Refund",
            });
          } else {
            // Bet winnings is strictly multiplier * bet!
            const payout = effectiveBet * mult;
            onUpdateAstrites(payout);
            soundEngine.playAstriteGain();
            setOutcomeModal({
              type: "win",
              title: "WIN!",
              landedTitle: "Result",
              landedValue: `${final1.symbol} ${final2.symbol} ${final3.symbol}`,
              betTitle: "Bet",
              betValue: `${effectiveBet.toLocaleString()} ✦`,
              deltaAmount: payout,
              multiplier: `${mult}x`,
            });
          }
        } else {
          // No 3-match: strictly LOSS
          soundEngine.playMissWhoosh();
          setOutcomeModal({
            type: "loss",
            title: "LOSE",
            landedTitle: "Result",
            landedValue: `${final1.symbol} ${final2.symbol} ${final3.symbol}`,
            betTitle: "Bet",
            betValue: `${effectiveBet.toLocaleString()} ✦`,
            deltaAmount: -effectiveBet,
          });
        }
      }, 450);
    }, 2300);
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative">
      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>
            Match 3 symbols across reels to win up to 50x. 🍒 refunds bet.
          </span>
        </div>
        <span className="text-[10px] font-mono text-purple-300 font-bold uppercase">
          50x Max Win
        </span>
      </div>

      {/* 3-Reel Display Cabinet */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#080d19] border-2 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.25)] w-full">
        <div className="grid grid-cols-3 gap-3">
          {reels.map((sym, idx) => (
            <div
              key={idx}
              className={`h-28 sm:h-36 rounded-xl bg-gradient-to-b from-[#0e1629] to-[#080d19] border-2 flex items-center justify-center text-4xl sm:text-6xl select-none transition-all ${
                isSpinning
                  ? "border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "border-purple-500/30 shadow-inner"
              }`}
            >
              {sym}
            </div>
          ))}
        </div>
      </div>

      {/* Paytable Summary Strip - Logos & Multipliers Only, No Yap */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full text-xs font-mono">
        {SLOT_SYMBOLS.map((s) => (
          <div key={s.id} className="p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center space-y-0.5">
            <span className="text-xl sm:text-2xl">{s.symbol}</span>
            <span className="text-yellow-400 font-bold">{s.mult}x</span>
            {s.isRefund && <span className="text-[9px] text-gray-400 font-bold uppercase">Refund</span>}
          </div>
        ))}
      </div>

      {/* Universal Bet Presets (100, 500, 1000, Custom) */}
      <BetSelector
        bet={bet}
        setBet={setBet}
        disabled={isSpinning}
        astriteBalance={astriteBalance}
        onInsufficient={(needed) => setInsufficientNeeded(needed)}
      />

      <button
        type="button"
        disabled={isSpinning}
        onClick={handleSpin}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 hover:from-purple-500 hover:to-indigo-400 text-white font-black uppercase text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:scale-101 active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
      >
        <Sparkles className="w-5 h-5" />
        <span>{isSpinning ? "SPINNING REELS..." : `PULL LEVER (${bet.toLocaleString()} ASTRITES)`}</span>
      </button>

      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          handleSpin();
        }}
        onClose={() => setOutcomeModal(null)}
      />

      {insufficientNeeded !== null && (
        <InsufficientAlertModal
          needed={insufficientNeeded}
          current={astriteBalance}
          onClose={() => setInsufficientNeeded(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-GAME 3: TACET 21 - Yinlin
// ============================================================================
interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  num: number;
}

const SUITS: Card["suit"][] = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const val of VALUES) {
      let num = parseInt(val, 10);
      if (val === "A") num = 11;
      else if (["J", "Q", "K"].includes(val)) num = 10;
      deck.push({ suit, value: val, num });
    }
  }
  // Cryptographic Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(getCryptoRandomFloat() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandScore(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.num;
    if (c.value === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

const BlackjackGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState(100);
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<"betting" | "playing" | "done">("betting");
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  const playerScore = useMemo(() => calculateHandScore(playerCards), [playerCards]);
  const dealerScore = useMemo(() => calculateHandScore(dealerCards), [dealerCards]);

  const handleDeal = () => {
    const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
    if (effectiveBet <= 0 || effectiveBet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(effectiveBet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-effectiveBet);
    setOutcomeModal(null);

    const freshDeck = createDeck();
    const p1 = freshDeck.pop()!;
    const d1 = freshDeck.pop()!;
    const p2 = freshDeck.pop()!;
    const d2 = freshDeck.pop()!;

    const pHand = [p1, p2];
    const dHand = [d1, d2];
    setDeck(freshDeck);
    setPlayerCards(pHand);
    setDealerCards(dHand);

    const pScore = calculateHandScore(pHand);
    const dScore = calculateHandScore(dHand);

    if (pScore === 21) {
      setGameState("done");
      setTimeout(() => {
        if (dScore === 21) {
          onUpdateAstrites(effectiveBet);
          setOutcomeModal({
            type: "push",
            title: "PUSH! BOTH HIT 21",
            landedTitle: "Dealer Hand",
            landedValue: `21 (${dHand.map((c) => c.value + c.suit).join(" ")})`,
            betTitle: "Your Hand",
            betValue: `21 (${pHand.map((c) => c.value + c.suit).join(" ")})`,
            deltaAmount: 0,
          });
        } else {
          const payout = Math.floor(effectiveBet * 2.5);
          onUpdateAstrites(payout);
          soundEngine.playAstriteGain();
          setOutcomeModal({
            type: "win",
            title: "NATURAL 21 BLACKJACK!",
            landedTitle: "Dealer Hand",
            landedValue: `${dScore} (${dHand.map((c) => c.value + c.suit).join(" ")})`,
            betTitle: "Your Hand",
            betValue: `21 Blackjack (${pHand.map((c) => c.value + c.suit).join(" ")})`,
            deltaAmount: payout,
            multiplier: "3:2 Payout",
          });
        }
      }, 450);
    } else {
      setGameState("playing");
    }
  };

  const handleHit = () => {
    if (gameState !== "playing" || deck.length === 0) return;
    soundEngine.playClick();
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    const newHand = [...playerCards, card];
    setDeck(newDeck);
    setPlayerCards(newHand);

    const score = calculateHandScore(newHand);
    if (score > 21) {
      setGameState("done");
      soundEngine.playMissWhoosh();
      const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
      setTimeout(() => {
        setOutcomeModal({
          type: "loss",
          title: "BUSTED OVER 21",
          landedTitle: "Your Score",
          landedValue: `${score} (Bust)`,
          landedSub: newHand.map((c) => c.value + c.suit).join(" "),
          betTitle: "Wager Lost",
          betValue: `${effectiveBet.toLocaleString()} Astrites`,
          deltaAmount: -effectiveBet,
        });
      }, 450);
    }
  };

  const handleStand = () => {
    if (gameState !== "playing") return;
    soundEngine.playClick();

    let currentDealer = [...dealerCards];
    let currentDeck = [...deck];
    let dScore = calculateHandScore(currentDealer);

    while (dScore < 17 && currentDeck.length > 0) {
      const card = currentDeck.pop()!;
      currentDealer.push(card);
      dScore = calculateHandScore(currentDealer);
    }

    setDeck(currentDeck);
    setDealerCards(currentDealer);
    setGameState("done");

    const pScore = calculateHandScore(playerCards);
    const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
    setTimeout(() => {
      if (dScore > 21) {
        const payout = effectiveBet * 2;
        onUpdateAstrites(payout);
        soundEngine.playAstriteGain();
        setOutcomeModal({
          type: "win",
          title: "DEALER BUSTED!",
          landedTitle: "Dealer Score",
          landedValue: `${dScore} (Bust)`,
          landedSub: currentDealer.map((c) => c.value + c.suit).join(" "),
          betTitle: "Your Score",
          betValue: `${pScore}`,
          betSub: playerCards.map((c) => c.value + c.suit).join(" "),
          deltaAmount: payout,
          multiplier: "2.0x Return",
        });
      } else if (pScore > dScore) {
        const payout = effectiveBet * 2;
        onUpdateAstrites(payout);
        soundEngine.playAstriteGain();
        setOutcomeModal({
          type: "win",
          title: "YOU BEAT THE DEALER!",
          landedTitle: "Dealer Score",
          landedValue: `${dScore}`,
          landedSub: currentDealer.map((c) => c.value + c.suit).join(" "),
          betTitle: "Your Score",
          betValue: `${pScore}`,
          betSub: playerCards.map((c) => c.value + c.suit).join(" "),
          deltaAmount: payout,
          multiplier: "2.0x Return",
        });
      } else if (pScore < dScore) {
        soundEngine.playMissWhoosh();
        setOutcomeModal({
          type: "loss",
          title: "DEALER WON",
          landedTitle: "Dealer Score",
          landedValue: `${dScore}`,
          landedSub: currentDealer.map((c) => c.value + c.suit).join(" "),
          betTitle: "Your Score",
          betValue: `${pScore}`,
          betSub: playerCards.map((c) => c.value + c.suit).join(" "),
          deltaAmount: -effectiveBet,
        });
      } else {
        onUpdateAstrites(effectiveBet);
        setOutcomeModal({
          type: "push",
          title: "PUSH (TIE)",
          landedTitle: "Dealer Score",
          landedValue: `${dScore}`,
          betTitle: "Your Score",
          betValue: `${pScore}`,
          deltaAmount: 0,
        });
      }
    }, 450);
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative">
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Layers className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            <strong>Yinlin:</strong> "Get as close to 21 as you dare without going over."
          </span>
        </div>
        <span className="text-[10px] font-mono text-rose-300 font-bold uppercase">
          3:2 Blackjack
        </span>
      </div>

      {/* Table Felt */}
      <div className="w-full p-4 rounded-2xl bg-[#091512] border-2 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] space-y-4">
        {/* Dealer Hand */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-2">
            <span>Yinlin (Dealer):</span>
            <span>
              {gameState === "playing"
                ? `Showing ${dealerCards[0]?.num || 0}`
                : `Total: ${dealerScore}`}
            </span>
          </div>
          <div className="flex justify-center gap-2 min-h-[90px]">
            {dealerCards.map((c, i) => {
              const isHole = i === 1 && gameState === "playing";
              return (
                <div
                  key={i}
                  className={`w-16 h-24 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-bold text-sm shadow-md transition-all ${
                    isHole
                      ? "bg-purple-900 border-purple-400 text-purple-200"
                      : "bg-white text-black border-gray-300"
                  }`}
                >
                  {isHole ? (
                    <span className="text-xl">🎴</span>
                  ) : (
                    <>
                      <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-black"}>
                        {c.value}
                      </span>
                      <span className="text-xs">{c.suit}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Player Hand */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-2">
            <span>Rover (You):</span>
            <span className="text-yellow-300 font-bold">Total: {playerScore}</span>
          </div>
          <div className="flex justify-center gap-2 min-h-[90px]">
            {playerCards.map((c, i) => (
              <div
                key={i}
                className="w-16 h-24 rounded-xl bg-white text-black border-2 border-yellow-400 flex flex-col items-center justify-center font-mono font-bold text-sm shadow-lg"
              >
                <span className={c.suit === "♥" || c.suit === "♦" ? "text-rose-600" : "text-black"}>
                  {c.value}
                </span>
                <span className="text-xs">{c.suit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      {gameState === "betting" ? (
        <div className="space-y-3 w-full">
          <BetSelector
            bet={bet}
            setBet={setBet}
            astriteBalance={astriteBalance}
            onInsufficient={(needed) => setInsufficientNeeded(needed)}
          />
          <button
            type="button"
            onClick={handleDeal}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white font-black uppercase text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:scale-101 active:scale-98 cursor-pointer"
          >
            DEAL CARDS ({bet.toLocaleString()} ASTRITES)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            onClick={handleHit}
            className="py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-sm tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            HIT (DRAW CARD)
          </button>
          <button
            type="button"
            onClick={handleStand}
            className="py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-sm tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            STAND (HOLD {playerScore})
          </button>
        </div>
      )}

      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          setGameState("betting");
        }}
        onClose={() => {
          setOutcomeModal(null);
          setGameState("betting");
        }}
      />

      {insufficientNeeded !== null && (
        <InsufficientAlertModal
          needed={insufficientNeeded}
          current={astriteBalance}
          onClose={() => setInsufficientNeeded(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// ============================================================================
// SUB-GAME 4: EUROPEAN ROULETTE (0 - 36) - Cantarella
// 37 Pockets (Single 0), Red/Black/Even/Odd/High/Low (2.0x), Dozens (3.0x), Single (36.0x)
// Strict 97.30% RTP (2.70% House Edge), Cryptographic RNG, Suspense Deceleration Wheel
// ============================================================================
const ROULETTE_NUMBERS_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function getRoulettePocketColor(num: number): "green" | "red" | "black" {
  if (num === 0) return "green";
  return RED_NUMBERS.has(num) ? "red" : "black";
}

const OUTSIDE_BETS = [
  { id: "red", label: "RED", mult: 2, bg: "bg-rose-600/80 hover:bg-rose-500 border-rose-400/60 text-white" },
  { id: "black", label: "BLACK", mult: 2, bg: "bg-zinc-800 hover:bg-zinc-700 border-zinc-500/60 text-white" },
  { id: "even", label: "EVEN", mult: 2, bg: "bg-white/5 hover:bg-white/10 border-white/15 text-gray-200" },
  { id: "odd", label: "ODD", mult: 2, bg: "bg-white/5 hover:bg-white/10 border-white/15 text-gray-200" },
  { id: "low", label: "1 - 18", mult: 2, bg: "bg-white/5 hover:bg-white/10 border-white/15 text-gray-200" },
  { id: "high", label: "19 - 36", mult: 2, bg: "bg-white/5 hover:bg-white/10 border-white/15 text-gray-200" },
];

const DOZEN_BETS = [
  { id: "dozen1", label: "1st 12 (1-12)", mult: 3 },
  { id: "dozen2", label: "2nd 12 (13-24)", mult: 3 },
  { id: "dozen3", label: "3rd 12 (25-36)", mult: 3 },
];

const RouletteGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState(100);
  const [selectedBet, setSelectedBet] = useState<string>("red");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningPocket, setWinningPocket] = useState<number | null>(null);
  const [recentHistory, setRecentHistory] = useState<number[]>([17, 32, 0, 7, 21]);
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  // Wheel carousel animation state
  const [translateX, setTranslateX] = useState<number>(0);
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  // Build repeated tape (5 copies = 185 pockets)
  const repeatedPockets = useMemo(() => {
    return [
      ...ROULETTE_NUMBERS_ORDER,
      ...ROULETTE_NUMBERS_ORDER,
      ...ROULETTE_NUMBERS_ORDER,
      ...ROULETTE_NUMBERS_ORDER,
      ...ROULETTE_NUMBERS_ORDER,
    ];
  }, []);

  const pocketWidth = 56; // 56px per pocket

  // Initialize wheel center on pocket 0 of 2nd set
  useEffect(() => {
    if (wheelContainerRef.current) {
      const containerW = wheelContainerRef.current.clientWidth || 360;
      const initialIdx = 37 * 2; // 0 pocket
      const targetCenter = initialIdx * pocketWidth + pocketWidth / 2;
      setTranslateX(-(targetCenter - containerW / 2));
    }
  }, []);

  // Compute selected bet descriptor
  const activeBetInfo = useMemo(() => {
    if (selectedBet.startsWith("num_")) {
      const num = parseInt(selectedBet.replace("num_", ""), 10);
      const color = getRoulettePocketColor(num);
      return {
        label: `Number ${num} (${color.toUpperCase()})`,
        mult: 36,
        category: "Straight-Up (36.0x)",
      };
    }
    const outside = OUTSIDE_BETS.find((b) => b.id === selectedBet);
    if (outside) {
      return { label: outside.label, mult: outside.mult, category: "Outside (2.0x)" };
    }
    const dozen = DOZEN_BETS.find((b) => b.id === selectedBet);
    if (dozen) {
      return { label: dozen.label, mult: dozen.mult, category: "Dozen (3.0x)" };
    }
    return { label: selectedBet.toUpperCase(), mult: 2, category: "Bet" };
  }, [selectedBet]);

  const handleSpin = () => {
    if (isSpinning) return;
    const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
    if (effectiveBet <= 0 || effectiveBet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(effectiveBet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-effectiveBet);
    setIsSpinning(true);
    setOutcomeModal(null);

    // Pick winning number cryptographically
    const landedNum = getCryptoRandomInt(0, 36);
    const landedColor = getRoulettePocketColor(landedNum);

    // Find landed index in 3rd repetition
    const landedIndexInSet = ROULETTE_NUMBERS_ORDER.indexOf(landedNum);
    const targetIdx = 37 * 3 + landedIndexInSet;

    const containerW = wheelContainerRef.current?.clientWidth || 360;
    const targetCenter = targetIdx * pocketWidth + pocketWidth / 2;
    // Add subtle randomized jitter within pocket (-12px to +12px)
    const jitter = Math.floor(getCryptoRandomFloat() * 24) - 12;
    setTranslateX(-(targetCenter + jitter - containerW / 2));

    // Audio clicks during spin
    let tickCount = 0;
    const totalTicks = 24;
    const tickInterval = setInterval(() => {
      soundEngine.playClick();
      tickCount++;
      if (tickCount >= totalTicks) {
        clearInterval(tickInterval);
      }
    }, 130);

    // Animation lasts 3.4 seconds
    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setWinningPocket(landedNum);
      setRecentHistory((prev) => [landedNum, ...prev.slice(0, 7)]);

      // Check win condition:
      let isWin = false;
      let multiplier = activeBetInfo.mult;

      if (landedNum === 0) {
        // Only straight-up bet on 0 wins; all outside and dozen bets lose
        isWin = selectedBet === "num_0";
      } else {
        if (selectedBet.startsWith("num_")) {
          const pickedNum = parseInt(selectedBet.replace("num_", ""), 10);
          isWin = pickedNum === landedNum;
        } else if (selectedBet === "red") {
          isWin = landedColor === "red";
        } else if (selectedBet === "black") {
          isWin = landedColor === "black";
        } else if (selectedBet === "even") {
          isWin = landedNum > 0 && landedNum % 2 === 0;
        } else if (selectedBet === "odd") {
          isWin = landedNum > 0 && landedNum % 2 !== 0;
        } else if (selectedBet === "low") {
          isWin = landedNum >= 1 && landedNum <= 18;
        } else if (selectedBet === "high") {
          isWin = landedNum >= 19 && landedNum <= 36;
        } else if (selectedBet === "dozen1") {
          isWin = landedNum >= 1 && landedNum <= 12;
        } else if (selectedBet === "dozen2") {
          isWin = landedNum >= 13 && landedNum <= 24;
        } else if (selectedBet === "dozen3") {
          isWin = landedNum >= 25 && landedNum <= 36;
        }
      }

      if (isWin) {
        const payout = effectiveBet * multiplier;
        onUpdateAstrites(payout);
        soundEngine.playAstriteGain();
        setOutcomeModal({
          type: "win",
          title: "WINNER!",
          landedTitle: "Landed Pocket",
          landedValue: `${landedNum} (${landedColor.toUpperCase()})`,
          landedColor: landedColor === "green" ? "#10b981" : landedColor === "red" ? "#f43f5e" : "#94a3b8",
          betTitle: "Your Bet",
          betValue: `${activeBetInfo.label} (${multiplier}.0x)`,
          deltaAmount: payout,
          multiplier: `${multiplier}.0x`,
        });
      } else {
        soundEngine.playMissWhoosh();
        setOutcomeModal({
          type: "loss",
          title: "HOUSE WINS",
          landedTitle: "Landed Pocket",
          landedValue: `${landedNum} (${landedColor.toUpperCase()})`,
          landedColor: landedColor === "green" ? "#10b981" : landedColor === "red" ? "#f43f5e" : "#94a3b8",
          betTitle: "Your Bet",
          betValue: `${activeBetInfo.label} (${multiplier}.0x)`,
          deltaAmount: -effectiveBet,
        });
      }
    }, 3400);
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center select-none">
      {/* Host Intro Banner */}
      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Disc className="w-4 h-4 text-purple-400 flex-shrink-0 animate-spin-slow" />
          <span>
            <strong>Cantarella:</strong> "European Roulette! Single 0, strict 97.30% RTP. Place your bets!"
          </span>
        </div>
        <span className="text-[10px] font-mono text-purple-300 font-bold uppercase flex-shrink-0">
          37 Pockets • 36x Max
        </span>
      </div>

      {/* Roulette Wheel Tape / Carousel */}
      <div className="w-full p-4 rounded-2xl bg-[#0d111d] border-2 border-purple-500/40 shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Top Gold Indicator Pointer */}
        <div className="flex flex-col items-center z-10 mb-1">
          <span className="text-amber-400 text-sm font-black animate-bounce">▼</span>
        </div>

        {/* Carousel Window */}
        <div
          ref={wheelContainerRef}
          className="w-full h-16 rounded-xl bg-black/80 border border-white/10 relative overflow-hidden flex items-center shadow-inner"
        >
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-amber-400/60 z-10 pointer-events-none -translate-x-1/2" />

          {/* Scrolling Pockets Strip */}
          <div
            className="flex items-center absolute left-0"
            style={{
              transform: `translateX(${translateX}px)`,
              transition: isSpinning
                ? "transform 3.4s cubic-bezier(0.12, 0.8, 0.25, 1)"
                : "none",
              willChange: "transform",
            }}
          >
            {repeatedPockets.map((num, i) => {
              const color = getRoulettePocketColor(num);
              return (
                <div
                  key={`${num}-${i}`}
                  style={{ width: `${pocketWidth}px` }}
                  className={`h-12 flex-shrink-0 flex flex-col items-center justify-center font-mono font-black border-r border-white/10 transition-colors ${
                    color === "green"
                      ? "bg-emerald-600/90 text-white"
                      : color === "red"
                      ? "bg-rose-600/90 text-white"
                      : "bg-zinc-800 text-gray-200"
                  }`}
                >
                  <span className="text-base sm:text-lg">{num}</span>
                  <span className="text-[8px] uppercase tracking-tighter opacity-70">
                    {color}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent History Badges */}
        <div className="flex items-center space-x-1.5 mt-3 text-xs font-mono">
          <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">History:</span>
          {recentHistory.map((num, idx) => {
            const color = getRoulettePocketColor(num);
            return (
              <span
                key={idx}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm ${
                  color === "green"
                    ? "bg-emerald-600 border border-emerald-400"
                    : color === "red"
                    ? "bg-rose-600 border border-rose-400"
                    : "bg-zinc-800 border border-zinc-600"
                }`}
              >
                {num}
              </span>
            );
          })}
        </div>
      </div>

      {/* Betting Board */}
      <div className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
        {/* Outside Bets (2x Multiplier) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
            <span className="font-bold uppercase text-yellow-300">Outside Bets (2.0x Payout)</span>
            <span>1:1 Net Return</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {OUTSIDE_BETS.map((b) => {
              const isSelected = selectedBet === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedBet(b.id);
                  }}
                  className={`py-2 px-1 rounded-xl font-mono text-xs font-black uppercase transition-all border cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-102 " + b.bg
                      : b.bg + " opacity-85 hover:opacity-100"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dozens Bets (3x Multiplier) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
            <span className="font-bold uppercase text-yellow-300">Dozens (3.0x Payout)</span>
            <span>2:1 Net Return</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {DOZEN_BETS.map((b) => {
              const isSelected = selectedBet === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedBet(b.id);
                  }}
                  className={`py-2 px-2 rounded-xl font-mono text-xs font-black uppercase transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-purple-600/40 text-purple-200 border-purple-400 ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-102"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Straight-Up Numbers (0-36) (36x Multiplier) */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
            <span className="font-bold uppercase text-yellow-300">Straight-Up Numbers (36.0x Payout)</span>
            <span>Select Any Single Number</span>
          </div>

          {/* 0 (Single Green Pocket) */}
          <div className="mb-1.5">
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => {
                soundEngine.playClick();
                setSelectedBet("num_0");
              }}
              className={`w-full py-1.5 rounded-xl font-mono font-black text-xs uppercase transition-all border cursor-pointer ${
                selectedBet === "num_0"
                  ? "bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-101"
                  : "bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40"
              }`}
            >
              0 (ZERO - 36.0x)
            </button>
          </div>

          {/* 1 - 36 Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
              const color = getRoulettePocketColor(n);
              const isSelected = selectedBet === `num_${n}`;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedBet(`num_${n}`);
                  }}
                  className={`py-1.5 rounded-lg font-mono text-xs font-black transition-all border cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-amber-400 scale-105 z-10 " +
                        (color === "red"
                          ? "bg-rose-600 text-white border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                          : "bg-zinc-700 text-white border-zinc-300 shadow-[0_0_12px_rgba(255,255,255,0.4)]")
                      : color === "red"
                      ? "bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-500/30"
                      : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 border-zinc-700/50"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Bet Details Bar */}
        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-left">
            <span className="text-gray-400">Bet:</span>
            <span className="text-white font-bold">{activeBetInfo.label}</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-black border border-purple-400/40">
              {activeBetInfo.mult}.0x
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 mr-1.5">Potential Win:</span>
            <span className="text-yellow-400 font-black">
              {Math.floor(bet * activeBetInfo.mult).toLocaleString()} ✦
            </span>
          </div>
        </div>

        {/* Bet Selector */}
        <BetSelector
          bet={bet}
          setBet={setBet}
          disabled={isSpinning}
          astriteBalance={astriteBalance}
          onInsufficient={setInsufficientNeeded}
        />

        {/* Spin Button */}
        <button
          type="button"
          disabled={isSpinning || bet <= 0 || bet > astriteBalance}
          onClick={handleSpin}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-mono font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
        >
          {isSpinning ? (
            <>
              <Disc className="w-4 h-4 animate-spin" />
              <span>SPINNING WHEEL...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>SPIN ROULETTE ({bet.toLocaleString()} ✦)</span>
            </>
          )}
        </button>
      </div>

      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          handleSpin();
        }}
        onClose={() => setOutcomeModal(null)}
      />

      {insufficientNeeded !== null && (
        <InsufficientAlertModal
          needed={insufficientNeeded}
          current={astriteBalance}
          onClose={() => setInsufficientNeeded(null)}
        />
      )}
    </div>
  );
};

// SUB-GAME 5: PHILIPPINE PERYA COLOR GAME (2-Dice) - Phoebe
// 6 Colors, 2 Six-Sided Color Dice, 1 Match = 2x Win, 2 Matches = 3x Double Win
// ============================================================================
export interface PeryaColor {
  id: string;
  name: string;
  hex: string;
  textColor: string;
  emoji: string;
}

export const PERYA_COLORS: PeryaColor[] = [
  { id: "red", name: "Red", hex: "#ef4444", textColor: "#ffffff", emoji: "🔴" },
  { id: "blue", name: "Blue", hex: "#3b82f6", textColor: "#ffffff", emoji: "🔵" },
  { id: "yellow", name: "Yellow", hex: "#eab308", textColor: "#000000", emoji: "🟡" },
  { id: "green", name: "Green", hex: "#22c55e", textColor: "#ffffff", emoji: "🟢" },
  { id: "white", name: "White", hex: "#f8fafc", textColor: "#000000", emoji: "⚪" },
  { id: "purple", name: "Purple", hex: "#a855f7", textColor: "#ffffff", emoji: "🟣" },
];

const WheelGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState(100);
  const [selectedColor, setSelectedColor] = useState<string>("yellow");
  const [isRolling, setIsRolling] = useState(false);
  const [diceResults, setDiceResults] = useState<[PeryaColor, PeryaColor]>([
    PERYA_COLORS[2], // yellow
    PERYA_COLORS[0], // red
  ]);
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  const handleRollDice = () => {
    if (isRolling) return;

    const effectiveBet = Math.min(bet, MAX_BET_LIMIT);
    if (effectiveBet <= 0 || effectiveBet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(effectiveBet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-effectiveBet);
    setIsRolling(true);
    setOutcomeModal(null);

    // Roll two 6-sided color dice independently with crypto RNG (1/6 chance per color per die)
    const finalDie1 = PERYA_COLORS[getCryptoRandomInt(0, PERYA_COLORS.length - 1)];
    const finalDie2 = PERYA_COLORS[getCryptoRandomInt(0, PERYA_COLORS.length - 1)];

    // Rapid tumbling color animation
    const interval = setInterval(() => {
      setDiceResults([
        PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
        PERYA_COLORS[Math.floor(Math.random() * PERYA_COLORS.length)],
      ]);
    }, 70);

    setTimeout(() => {
      clearInterval(interval);
      setDiceResults([finalDie1, finalDie2]);
      setIsRolling(false);
      soundEngine.playClick();

      // Inspection delay before outcome popup
      setTimeout(() => {
        const matches = (finalDie1.id === selectedColor ? 1 : 0) + (finalDie2.id === selectedColor ? 1 : 0);
        const chosen = PERYA_COLORS.find((c) => c.id === selectedColor) || PERYA_COLORS[0];

        if (matches === 2) {
          // Double Match: Win 4.2x! (Authentic 95.00% RTP perya combinatorics)
          const payout = Math.floor(effectiveBet * 4.2);
          onUpdateAstrites(payout);
          soundEngine.playAstriteGain();
          setOutcomeModal({
            type: "win",
            title: "4.2x DOUBLE WIN!",
            landedTitle: "Dice",
            landedValue: `${finalDie1.emoji} ${finalDie2.emoji}`,
            landedColor: chosen.hex,
            betTitle: "Bet",
            betValue: `${chosen.name} (${effectiveBet.toLocaleString()} ✦)`,
            deltaAmount: payout,
            multiplier: "4.2x Double",
          });
        } else if (matches === 1) {
          // Single Match: Win 3.0x!
          const payout = Math.floor(effectiveBet * 3.0);
          onUpdateAstrites(payout);
          soundEngine.playAstriteGain();
          setOutcomeModal({
            type: "win",
            title: "3.0x WIN!",
            landedTitle: "Dice",
            landedValue: `${finalDie1.emoji} ${finalDie2.emoji}`,
            landedColor: chosen.hex,
            betTitle: "Bet",
            betValue: `${chosen.name} (${effectiveBet.toLocaleString()} ✦)`,
            deltaAmount: payout,
            multiplier: "3.0x Win",
          });
        } else {
          // 0 Matches: Loss (-effectiveBet)
          soundEngine.playMissWhoosh();
          setOutcomeModal({
            type: "loss",
            title: "LOSE",
            landedTitle: "Dice",
            landedValue: `${finalDie1.emoji} ${finalDie2.emoji}`,
            betTitle: "Bet",
            betValue: `${chosen.name} (${effectiveBet.toLocaleString()} ✦)`,
            deltaAmount: -effectiveBet,
          });
        }
      }, 450);
    }, 1400);
  };

  const selectedObj = PERYA_COLORS.find((c) => c.id === selectedColor) || PERYA_COLORS[0];

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative">
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <CircleDot className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            Pick a color & roll 2 dice. 1 match = 3.0x win, 2 matches = 4.2x double!
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">
          4.2x Double
        </span>
      </div>

      {/* 2-Dice Display Arena */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#080d19] border-2 border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.2)] w-full flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {diceResults.map((die, idx) => (
            <motion.div
              key={idx}
              animate={
                isRolling
                  ? {
                      rotate: [0, 90, 180, 270, 360],
                      scale: [1, 1.1, 0.95, 1],
                      y: [0, -15, 5, 0],
                    }
                  : { rotate: 0, scale: 1, y: 0 }
              }
              transition={
                isRolling
                  ? { repeat: Infinity, duration: 0.35, ease: "linear" }
                  : { duration: 0.2 }
              }
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 flex flex-col items-center justify-center shadow-2xl transition-colors select-none"
              style={{
                backgroundColor: die.hex,
                borderColor: die.id === "white" ? "#cbd5e1" : "#ffffff40",
                boxShadow: `0 0 25px ${die.hex}60`,
              }}
            >
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/60 shadow-inner flex items-center justify-center font-mono font-black text-sm"
                style={{
                  backgroundColor: "rgba(0,0,0,0.15)",
                  color: die.textColor,
                }}
              >
                {die.emoji}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-xs font-mono text-gray-400">
          Selected: <strong style={{ color: selectedObj.hex }}>{selectedObj.name}</strong>
        </div>
      </div>

      {/* 6 Color Bet Buttons (Perya Board) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full">
        {PERYA_COLORS.map((col) => {
          const isSelected = selectedColor === col.id;
          return (
            <button
              key={col.id}
              type="button"
              disabled={isRolling}
              onClick={() => {
                soundEngine.playClick();
                setSelectedColor(col.id);
              }}
              className={`py-3 px-2 rounded-xl font-mono font-bold text-xs sm:text-sm flex flex-col items-center justify-center space-y-1 transition-all border cursor-pointer ${
                isSelected
                  ? "scale-105 shadow-lg border-white ring-2 ring-white"
                  : "hover:scale-102 border-transparent opacity-85 hover:opacity-100"
              }`}
              style={{
                backgroundColor: col.hex,
                color: col.textColor,
                boxShadow: isSelected ? `0 0 20px ${col.hex}90` : undefined,
              }}
            >
              <span className="text-base">{col.emoji}</span>
              <span className="font-black uppercase tracking-wider">{col.name}</span>
            </button>
          );
        })}
      </div>

      {/* Universal Bet Presets */}
      <BetSelector
        bet={bet}
        setBet={setBet}
        disabled={isRolling}
        astriteBalance={astriteBalance}
        onInsufficient={(needed) => setInsufficientNeeded(needed)}
      />

      {/* Big Roll Dice Button */}
      <button
        type="button"
        disabled={isRolling}
        onClick={handleRollDice}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black uppercase text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:scale-101 active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
      >
        <Dices className="w-5 h-5" />
        <span>{isRolling ? "ROLLING DICE..." : `ROLL DICE (${bet.toLocaleString()} ASTRITES)`}</span>
      </button>

      {/* Outcome Modal */}
      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={handleRollDice}
        onClose={() => setOutcomeModal(null)}
      />

      {/* Insufficient Warning */}
      {insufficientNeeded !== null && (
        <InsufficientAlertModal
          needed={insufficientNeeded}
          current={astriteBalance}
          onClose={() => setInsufficientNeeded(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// ============================================================================
// SUB-GAME 6: MYSTERY SCRATCHCARDS (5×5 4-STRIKE BUST) - Lupa
// 25 Panels: Exactly 3 of 20x, 3 of 10x, 3 of 5x, 3 of 2x (12 prizes) + 13 Misses
// Match 3 = Win that multiplier! 4 Misses = Bust / Lose! Custom Bet Pricing
// ============================================================================
type MultiplierType = "20x" | "10x" | "5x" | "2x" | "miss";

interface ScratchIconInfo {
  type: MultiplierType;
  label: string;
  mult: number;
  icon: string;
  color: string;
}

const MULTIPLIER_DEFS: Record<MultiplierType, ScratchIconInfo> = {
  "20x": { type: "20x", label: "20x Jackpot", mult: 20, icon: "🌟", color: "#facc15" },
  "10x": { type: "10x", label: "10x Boss", mult: 10, icon: "👑", color: "#c084fc" },
  "5x": { type: "5x", label: "5x Win", mult: 5, icon: "⭐", color: "#38bdf8" },
  "2x": { type: "2x", label: "2x Win", mult: 2, icon: "💎", color: "#34d399" },
  miss: { type: "miss", label: "Miss", mult: 0, icon: "❌", color: "#f43f5e" },
};

const ScratchcardGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState(100);
  const [hasBought, setHasBought] = useState(false);
  const [scratched, setScratched] = useState<boolean[]>(Array(25).fill(false));
  const [gridPanels, setGridPanels] = useState<MultiplierType[]>(Array(25).fill("miss"));
  const [isGameOver, setIsGameOver] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  // Live counts of revealed multipliers and misses
  const revealedStats = useMemo(() => {
    const counts: Record<MultiplierType, number> = {
      "20x": 0,
      "10x": 0,
      "5x": 0,
      "2x": 0,
      miss: 0,
    };
    gridPanels.forEach((p, idx) => {
      if (scratched[idx]) {
        counts[p]++;
      }
    });
    return counts;
  }, [gridPanels, scratched]);

  const effectiveBet = Math.min(bet, MAX_BET_LIMIT);

  const handleBuyCard = () => {
    if (effectiveBet <= 0 || effectiveBet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(effectiveBet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-effectiveBet);
    setHasBought(true);
    setIsGameOver(false);
    setScratched(Array(25).fill(false));
    setOutcomeModal(null);

    // Build the 25 panels:
    // Exactly 3 of every multiplier: 3x 20x, 3x 10x, 3x 5x, 3x 2x (12 prizes)
    // Left spots filled by miss: 13x miss
    const fullGrid: MultiplierType[] = [
      "20x", "20x", "20x",
      "10x", "10x", "10x",
      "5x", "5x", "5x",
      "2x", "2x", "2x",
      "miss", "miss", "miss", "miss", "miss",
      "miss", "miss", "miss", "miss", "miss",
      "miss", "miss", "miss",
    ];

    // Cryptographic Fisher-Yates shuffle
    for (let i = fullGrid.length - 1; i > 0; i--) {
      const j = Math.floor(getCryptoRandomFloat() * (i + 1));
      [fullGrid[i], fullGrid[j]] = [fullGrid[j], fullGrid[i]];
    }

    setGridPanels(fullGrid);
  };

  const evaluateGrid = (updatedScratched: boolean[], panels: MultiplierType[]) => {
    const counts: Record<MultiplierType, number> = {
      "20x": 0,
      "10x": 0,
      "5x": 0,
      "2x": 0,
      miss: 0,
    };

    for (let i = 0; i < 25; i++) {
      if (updatedScratched[i]) {
        const type = panels[i];
        counts[type]++;

        // 1. Check for 4 misses -> BUST LOSE!
        if (counts.miss >= 4) {
          setIsGameOver(true);
          // Reveal full board
          setScratched(Array(25).fill(true));
          setTimeout(() => {
            soundEngine.playMissWhoosh();
            setOutcomeModal({
              type: "loss",
              title: "STRUCK OUT! 4 MISSES",
              landedTitle: "Result",
              landedValue: "❌ 4 Misses (Bust)",
              landedColor: "#f43f5e",
              betTitle: "Ticket Wager",
              betValue: `${effectiveBet.toLocaleString()} ✦`,
              deltaAmount: -effectiveBet,
            });
          }, 350);
          return true;
        }

        // 2. Check for 3 matching multipliers -> WIN!
        if (type !== "miss" && counts[type] >= 3) {
          const def = MULTIPLIER_DEFS[type];
          const payout = effectiveBet * def.mult;
          setIsGameOver(true);
          // Reveal full board
          setScratched(Array(25).fill(true));
          setTimeout(() => {
            onUpdateAstrites(payout);
            soundEngine.playAstriteGain();
            setOutcomeModal({
              type: "win",
              title: "3-MATCH WINNER!",
              landedTitle: "Winning Match",
              landedValue: `${def.icon} ${def.mult}x Match!`,
              landedColor: def.color,
              betTitle: "Ticket Wager",
              betValue: `${effectiveBet.toLocaleString()} ✦`,
              deltaAmount: payout,
              multiplier: `${def.mult}x`,
            });
          }, 350);
          return true;
        }
      }
    }

    return false;
  };

  const handleScratchPanel = (index: number) => {
    if (!hasBought || scratched[index] || isGameOver || outcomeModal) return;
    soundEngine.playClick();
    const updated = [...scratched];
    updated[index] = true;
    setScratched(updated);
    evaluateGrid(updated, gridPanels);
  };

  const handleScratchAll = () => {
    if (!hasBought || isGameOver || outcomeModal) return;
    soundEngine.playClick();

    // Sequentially scratch until 4 misses or 3-match is encountered
    const updated = [...scratched];
    const counts: Record<MultiplierType, number> = {
      "20x": 0,
      "10x": 0,
      "5x": 0,
      "2x": 0,
      miss: 0,
    };

    // First account for already scratched
    for (let i = 0; i < 25; i++) {
      if (updated[i]) {
        counts[gridPanels[i]]++;
      }
    }

    // Now step through remaining
    for (let i = 0; i < 25; i++) {
      if (!updated[i]) {
        updated[i] = true;
        const type = gridPanels[i];
        counts[type]++;

        if (counts.miss >= 4 || (type !== "miss" && counts[type] >= 3)) {
          break;
        }
      }
    }

    setScratched(updated);
    evaluateGrid(updated, gridPanels);
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative select-none">
      {/* Host Intro Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Ticket className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Lupa:</strong> "5×5 Card! Match 3 of any multiplier to WIN! But watch out: 4 misses = BUST!"
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-300 font-bold uppercase flex-shrink-0">
          5×5 4-Strike
        </span>
      </div>

      {/* Buy Ticket Arena */}
      {!hasBought ? (
        <div className="w-full p-5 rounded-2xl bg-[#0e121d] border-2 border-amber-400/40 shadow-2xl space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-black font-mono text-white uppercase tracking-wider">
              Purchase Mystery Scratchcard
            </h3>
            <p className="text-xs font-mono text-gray-400">
              Customize your wager. Win up to <strong className="text-yellow-400">20x your bet</strong>! (Max: 250,000 ✦)
            </p>
          </div>

          {/* Potential Payouts Preview */}
          <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
            {(["20x", "10x", "5x", "2x"] as MultiplierType[]).map((type) => {
              const def = MULTIPLIER_DEFS[type];
              return (
                <div key={type} className="p-2 rounded-lg bg-white/5 flex flex-col items-center">
                  <span className="text-lg">{def.icon}</span>
                  <span className="font-black text-sm" style={{ color: def.color }}>
                    {def.mult}x
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {Math.floor(effectiveBet * def.mult).toLocaleString()} ✦
                  </span>
                </div>
              );
            })}
          </div>

          <BetSelector
            bet={bet}
            setBet={setBet}
            astriteBalance={astriteBalance}
            onInsufficient={setInsufficientNeeded}
          />

          <button
            type="button"
            disabled={effectiveBet <= 0 || effectiveBet > astriteBalance}
            onClick={handleBuyCard}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
          >
            <Ticket className="w-4 h-4" />
            <span>BUY SCRATCHCARD ({effectiveBet.toLocaleString()} ✦)</span>
          </button>
        </div>
      ) : (
        /* Active 5×5 Scratchcard Arena */
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#130f1e] to-black border-2 border-amber-400/50 shadow-2xl space-y-3.5">
          {/* Top Bar with Strikes Meter and Scratch All */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            {/* Strikes Meter: 4 Misses = Bust */}
            <div className="flex items-center space-x-2 p-1.5 px-3 rounded-xl bg-black/60 border border-white/10">
              <span className="text-gray-400 text-[11px] font-bold uppercase">Strikes:</span>
              <div className="flex items-center space-x-1.5">
                {[0, 1, 2, 3].map((strikeIdx) => {
                  const isStruck = revealedStats.miss > strikeIdx;
                  return (
                    <div
                      key={strikeIdx}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs border transition-all ${
                        isStruck
                          ? "bg-rose-500/25 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)] scale-105"
                          : "bg-white/5 border-white/20 text-gray-600"
                      }`}
                    >
                      {isStruck ? "❌" : "⚪"}
                    </div>
                  );
                })}
              </div>
              <span className={`text-[11px] font-bold ${revealedStats.miss >= 3 ? "text-rose-400 animate-pulse" : "text-gray-400"}`}>
                ({revealedStats.miss}/4)
              </span>
            </div>

            {!isGameOver && (
              <button
                type="button"
                onClick={handleScratchAll}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-yellow-300 text-black text-xs font-black uppercase transition-all shadow-[0_0_12px_rgba(251,191,36,0.3)] active:scale-95 cursor-pointer"
              >
                Scratch All
              </button>
            )}
          </div>

          {/* Multiplier Progress Tracker Bar */}
          <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono">
            {(["20x", "10x", "5x", "2x"] as MultiplierType[]).map((type) => {
              const def = MULTIPLIER_DEFS[type];
              const count = revealedStats[type];
              return (
                <div key={type} className="flex flex-col items-center p-1.5 rounded-lg bg-white/5">
                  <div className="flex items-center space-x-1 font-black text-xs" style={{ color: def.color }}>
                    <span>{def.icon}</span>
                    <span>{def.mult}x</span>
                  </div>
                  <div className="flex space-x-1 mt-1.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full border ${
                          i < count
                            ? "bg-yellow-400 border-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.9)] scale-110"
                            : "bg-white/10 border-white/20"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-0.5">{count}/3</span>
                </div>
              );
            })}
          </div>

          {/* 5×5 Grid (25 Panels: Exactly 3 of each mult + 13 misses) */}
          <div className="grid grid-cols-5 gap-2 max-w-sm sm:max-w-md mx-auto">
            {gridPanels.map((type, idx) => {
              const isRevealed = scratched[idx];
              const def = MULTIPLIER_DEFS[type];
              return (
                <div
                  key={idx}
                  onClick={() => handleScratchPanel(idx)}
                  className={`h-14 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-black select-none cursor-pointer transition-all ${
                    isRevealed
                      ? type === "miss"
                        ? "bg-[#180a0f] border-rose-500/40 text-rose-400 shadow-inner"
                        : "bg-[#0c1424] border-amber-400/50 shadow-inner"
                      : "bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 border-yellow-200 text-amber-950 shadow-md hover:brightness-115 hover:scale-102 active:scale-95"
                  }`}
                >
                  {isRevealed ? (
                    <div className="flex flex-col items-center animate-fade-in">
                      <span className="text-xl sm:text-2xl drop-shadow">{def.icon}</span>
                      <span className="text-[10px] font-mono font-black" style={{ color: def.color }}>
                        {def.mult > 0 ? `${def.mult}x` : "MISS"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-mono font-black tracking-wider uppercase drop-shadow text-amber-950/80">
                      ✦
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Button: Buy Another Card */}
          <button
            type="button"
            onClick={() => setHasBought(false)}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer"
          >
            {isGameOver ? "Play Another Scratchcard" : "Change Wager / New Card"}
          </button>
        </div>
      )}

      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          handleBuyCard();
        }}
        onClose={() => setOutcomeModal(null)}
      />

      {insufficientNeeded !== null && (
        <InsufficientAlertModal
          needed={insufficientNeeded}
          current={astriteBalance}
          onClose={() => setInsufficientNeeded(null)}
        />
      )}
    </div>
  );
};

