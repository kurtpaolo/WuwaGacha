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

export type MinigameId = "coinflip" | "slots" | "blackjack" | "dice" | "wheel" | "scratch";

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
    title: "Dice Ladder",
    tag: "1-20 Ladder",
  },
  wheel: {
    name: "Phoebe",
    title: "Color Game",
    tag: "Color Game",
  },
  scratch: {
    name: "Lupa",
    title: "Mystery Scratchcards",
    tag: "5x5 Match 3",
  },
};

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
    if (amt > astriteBalance) {
      soundEngine.playInsufficient();
      onInsufficient?.(amt);
      return;
    }
    soundEngine.playClick();
    setIsCustom(false);
    setBet(amt);
  };

  const handleCustomInput = (val: string) => {
    setCustomText(val);
    const parsed = parseInt(val.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setBet(Math.min(parsed, astriteBalance));
    }
  };

  return (
    <div className="space-y-2 w-full pt-1">
      <div className="flex items-center justify-between text-xs font-mono text-gray-400">
        <span>Choose Bet:</span>
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
        <div className="flex items-center gap-2 pt-1 animate-fade-in">
          <div className="relative flex-1">
            <input
              type="text"
              disabled={disabled}
              value={customText}
              placeholder="Enter bet amount..."
              onChange={(e) => handleCustomInput(e.target.value)}
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
              setCustomText(astriteBalance.toString());
              setBet(astriteBalance);
            }}
            className="px-3 py-1.5 rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-mono text-xs font-bold transition-all cursor-pointer"
          >
            MAX
          </button>
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
                { id: "dice", label: "Cantarella", icon: Dices },
                { id: "wheel", label: "Phoebe", icon: CircleDot },
                { id: "scratch", label: "Lupa", icon: Ticket },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isSelected = activeGame === t.id;
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
          {activeGame === "dice" && (
            <DiceLadderGame astriteBalance={astriteBalance} onUpdateAstrites={onUpdateAstrites} />
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

    if (bet <= 0 || bet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(bet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-bet);
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
      if (won) {
        // True Double or Nothing (2.0x gross payout)
        const payout = bet * 2;
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
          betValue: `${side.toUpperCase()} (${bet.toLocaleString()} ✦)`,
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
          betValue: `${side.toUpperCase()} (${bet.toLocaleString()} ✦)`,
          deltaAmount: -bet,
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

    if (bet <= 0 || bet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(bet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-bet);
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
        if (final1.id === final2.id && final2.id === final3.id) {
          const mult = final1.mult;
          if (final1.isRefund) {
            // Push / Refund: Get what you bet back!
            onUpdateAstrites(bet);
            soundEngine.playAstriteGain();
            setOutcomeModal({
              type: "push",
              title: "REFUND",
              landedTitle: "Result",
              landedValue: `${final1.symbol} ${final2.symbol} ${final3.symbol}`,
              betTitle: "Bet",
              betValue: `${bet.toLocaleString()} ✦`,
              deltaAmount: 0,
              multiplier: "1.0x Refund",
            });
          } else {
            // Bet winnings is strictly multiplier * bet!
            const payout = bet * mult;
            onUpdateAstrites(payout);
            soundEngine.playAstriteGain();
            setOutcomeModal({
              type: "win",
              title: "WIN!",
              landedTitle: "Result",
              landedValue: `${final1.symbol} ${final2.symbol} ${final3.symbol}`,
              betTitle: "Bet",
              betValue: `${bet.toLocaleString()} ✦`,
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
            betValue: `${bet.toLocaleString()} ✦`,
            deltaAmount: -bet,
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
    if (bet <= 0 || bet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(bet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-bet);
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
          onUpdateAstrites(bet);
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
          const payout = Math.floor(bet * 2.5);
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
      setTimeout(() => {
        setOutcomeModal({
          type: "loss",
          title: "BUSTED OVER 21",
          landedTitle: "Your Score",
          landedValue: `${score} (Bust)`,
          landedSub: newHand.map((c) => c.value + c.suit).join(" "),
          betTitle: "Wager Lost",
          betValue: `${bet.toLocaleString()} Astrites`,
          deltaAmount: -bet,
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
    setTimeout(() => {
      if (dScore > 21) {
        const payout = bet * 2;
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
        const payout = bet * 2;
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
          deltaAmount: -bet,
        });
      } else {
        onUpdateAstrites(bet);
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
// SUB-GAME 4: DICE LADDER (1 to 20) - Cantarella
// Number 1-20, Dynamic Conditional Odds, Fair Cash Out, Tie Push
// ============================================================================
const LADDER_STEPS_20 = [0.5, 1.5, 2.4, 4.2, 8.5, 18.0, 40.0];

const DiceLadderGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [bet, setBet] = useState(100);
  const [currentNum, setCurrentNum] = useState<number>(10);
  const [stepIndex, setStepIndex] = useState(-1);
  const [isRolling, setIsRolling] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  const handleStartRun = () => {
    if (bet <= 0 || bet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(bet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-bet);
    setOutcomeModal(null);

    // Initial roll: random number between 7 and 14 for a balanced starting point
    const initial = getCryptoRandomInt(7, 14);
    setCurrentNum(initial);
    setStepIndex(0);
  };

  const handleGuess = (guess: "higher" | "lower") => {
    if (isRolling || stepIndex < 0) return;
    soundEngine.playClick();
    setIsRolling(true);

    // Rolling animation rapid cycling 1 to 20
    const interval = setInterval(() => {
      setCurrentNum(getCryptoRandomInt(1, 20));
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      const nextNum = getCryptoRandomInt(1, 20);
      setCurrentNum(nextNum);
      setIsRolling(false);

      // Check for exact tie roll:
      // At step 0: treat as Push (bet refunded!)
      // At step > 0: hold streak without penalty!
      if (nextNum === currentNum) {
        setTimeout(() => {
          if (stepIndex === 0) {
            onUpdateAstrites(bet);
            soundEngine.playAstriteGain();
            setStepIndex(-1);
            setOutcomeModal({
              type: "push",
              title: "TIE ROLL! BET RETURNED",
              landedTitle: "Rolled Number",
              landedValue: `${nextNum} (Tie)`,
              betTitle: "Your Call",
              betValue: `${guess.toUpperCase()} (Was: ${currentNum})`,
              deltaAmount: 0,
              multiplier: "1.0x Push",
            });
          } else {
            soundEngine.playClick();
          }
        }, 450);
        return;
      }

      let correct = false;
      if (guess === "higher" && nextNum > currentNum) correct = true;
      if (guess === "lower" && nextNum < currentNum) correct = true;

      // 450ms inspection delay
      setTimeout(() => {
        if (correct) {
          soundEngine.playAstriteGain();
          const nextStep = stepIndex + 1;
          if (nextStep >= LADDER_STEPS_20.length - 1) {
            const mult = LADDER_STEPS_20[LADDER_STEPS_20.length - 1];
            const payout = Math.floor(bet * mult);
            onUpdateAstrites(payout);
            setStepIndex(-1);
            setOutcomeModal({
              type: "win",
              title: "MAX LADDER ASCENT!",
              landedTitle: "Final Number",
              landedValue: `${nextNum} (1-20)`,
              betTitle: "Ascent Reached",
              betValue: `${mult}x Top Step`,
              deltaAmount: payout,
              multiplier: `${mult}x Payout`,
            });
          } else {
            setStepIndex(nextStep);
          }
        } else {
          soundEngine.playMissWhoosh();
          setStepIndex(-1);
          setOutcomeModal({
            type: "loss",
            title: "BUSTED ON LADDER",
            landedTitle: "Rolled Number",
            landedValue: `${nextNum} (1-20)`,
            betTitle: "Your Call",
            betValue: `${guess.toUpperCase()} (Was: ${currentNum})`,
            deltaAmount: -bet,
          });
        }
      }, 450);
    }, 600);
  };

  const handleCashOut = () => {
    if (stepIndex < 0) return;
    soundEngine.playClick();
    const mult = LADDER_STEPS_20[stepIndex];
    const payout = Math.floor(bet * mult);
    onUpdateAstrites(payout);
    setStepIndex(-1);
    soundEngine.playAstriteGain();

    if (mult < 1.0) {
      setOutcomeModal({
        type: "loss",
        title: "EARLY CASH OUT",
        landedTitle: "Cashed Out At",
        landedValue: `${mult}x Base Step`,
        betTitle: "Initial Stake",
        betValue: `${bet.toLocaleString()} Astrites`,
        deltaAmount: payout - bet,
        multiplier: `${mult}x Forfeit`,
      });
    } else if (mult === 1.0) {
      setOutcomeModal({
        type: "push",
        title: "BREAK-EVEN CASH OUT!",
        landedTitle: "Cashed Out At",
        landedValue: "1.0x Base Step",
        betTitle: "Initial Stake",
        betValue: `${bet.toLocaleString()} Astrites`,
        deltaAmount: 0,
        multiplier: "1.0x Refund",
      });
    } else {
      setOutcomeModal({
        type: "win",
        title: "SUCCESSFUL CASH OUT!",
        landedTitle: "Cashed Out At",
        landedValue: `${mult}x Step`,
        betTitle: "Initial Stake",
        betValue: `${bet.toLocaleString()} Astrites`,
        deltaAmount: payout,
        multiplier: `${mult}x Return`,
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative">
      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Dices className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            <strong>Cantarella:</strong> "Roll 1 to 20. Guess Higher or Lower to climb the ladder!"
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase">
          40x Top Step
        </span>
      </div>

      {/* Multiplier Ladder Progress Bar */}
      <div className="flex items-center justify-between gap-1 w-full p-2 rounded-xl bg-black/40 border border-white/10">
        {LADDER_STEPS_20.map((m, idx) => {
          const isPassed = stepIndex >= idx;
          const isCurrent = stepIndex === idx;
          return (
            <div
              key={idx}
              className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] sm:text-xs font-bold transition-all ${
                isCurrent
                  ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.5)] scale-105"
                  : isPassed
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                  : "bg-white/5 text-gray-500"
              }`}
            >
              {m}x
            </div>
          );
        })}
      </div>

      {/* Cyber D20 Visualizer */}
      <div className="p-6 rounded-2xl bg-[#0a1224] border-2 border-cyan-500/40 shadow-inner flex flex-col items-center space-y-3 w-full">
        <div
          className={`w-28 h-28 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-black border-4 border-white flex flex-col items-center justify-center font-mono font-black text-4xl sm:text-5xl shadow-[0_0_30px_rgba(6,182,212,0.4)] ${
            isRolling ? "animate-spin" : ""
          }`}
        >
          <span>{currentNum}</span>
          <span className="text-[10px] font-bold tracking-widest text-cyan-950 uppercase -mt-1">
            D20 DIE
          </span>
        </div>
        <div className="text-xs font-mono text-gray-400">
          Will the next roll (1 to 20) be Higher or Lower than <strong className="text-cyan-300">{currentNum}</strong>?
        </div>
      </div>

      {/* Controls: Higher or Lower Only */}
      {stepIndex < 0 ? (
        <div className="w-full space-y-2">
          <BetSelector
            bet={bet}
            setBet={setBet}
            astriteBalance={astriteBalance}
            onInsufficient={(needed) => setInsufficientNeeded(needed)}
          />
          <button
            type="button"
            onClick={handleStartRun}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black uppercase text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer"
          >
            START RUN ({bet.toLocaleString()} ASTRITES)
          </button>
        </div>
      ) : (
        <div className="space-y-3 w-full">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isRolling}
              onClick={() => handleGuess("higher")}
              className="py-3.5 rounded-xl bg-emerald-600/40 hover:bg-emerald-600/60 border-2 border-emerald-400 text-emerald-200 font-mono font-black text-sm uppercase flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-95"
            >
              <ArrowUp className="w-5 h-5 text-emerald-400" />
              <span>HIGHER (&gt; {currentNum})</span>
            </button>
            <button
              type="button"
              disabled={isRolling}
              onClick={() => handleGuess("lower")}
              className="py-3.5 rounded-xl bg-rose-600/40 hover:bg-rose-600/60 border-2 border-rose-400 text-rose-200 font-mono font-black text-sm uppercase flex items-center justify-center space-x-2 cursor-pointer shadow-lg active:scale-95"
            >
              <ArrowDown className="w-5 h-5 text-rose-400" />
              <span>LOWER (&lt; {currentNum})</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isRolling}
            onClick={handleCashOut}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:scale-101 active:scale-98 cursor-pointer"
          >
            {LADDER_STEPS_20[stepIndex] < 1.0
              ? `CASH OUT ${Math.floor(bet * LADDER_STEPS_20[stepIndex]).toLocaleString()} ASTRITES (${LADDER_STEPS_20[stepIndex]}x FORFEIT)`
              : LADDER_STEPS_20[stepIndex] === 1.0
              ? `CASH OUT ${bet.toLocaleString()} ASTRITES (1.0x BREAK-EVEN REFUND)`
              : `CASH OUT ${Math.floor(bet * LADDER_STEPS_20[stepIndex]).toLocaleString()} ASTRITES (${LADDER_STEPS_20[stepIndex]}x)`}
          </button>
        </div>
      )}

      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          handleStartRun();
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

    if (bet <= 0 || bet > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(bet);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-bet);
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
          const payout = Math.floor(bet * 4.2);
          onUpdateAstrites(payout);
          soundEngine.playAstriteGain();
          setOutcomeModal({
            type: "win",
            title: "4.2x DOUBLE WIN!",
            landedTitle: "Dice",
            landedValue: `${finalDie1.emoji} ${finalDie2.emoji}`,
            landedColor: chosen.hex,
            betTitle: "Bet",
            betValue: `${chosen.name} (${bet.toLocaleString()} ✦)`,
            deltaAmount: payout,
            multiplier: "4.2x Double",
          });
        } else if (matches === 1) {
          // Single Match: Win 3.0x!
          const payout = Math.floor(bet * 3.0);
          onUpdateAstrites(payout);
          soundEngine.playAstriteGain();
          setOutcomeModal({
            type: "win",
            title: "3.0x WIN!",
            landedTitle: "Dice",
            landedValue: `${finalDie1.emoji} ${finalDie2.emoji}`,
            landedColor: chosen.hex,
            betTitle: "Bet",
            betValue: `${chosen.name} (${bet.toLocaleString()} ✦)`,
            deltaAmount: payout,
            multiplier: "3.0x Win",
          });
        } else {
          // 0 Matches: Loss (-bet)
          soundEngine.playMissWhoosh();
          setOutcomeModal({
            type: "loss",
            title: "LOSE",
            landedTitle: "Dice",
            landedValue: `${finalDie1.emoji} ${finalDie2.emoji}`,
            betTitle: "Bet",
            betValue: `${chosen.name} (${bet.toLocaleString()} ✦)`,
            deltaAmount: -bet,
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
// SUB-GAME 6: MYSTERY SCRATCHCARDS (5×5 Grid) - Lupa
// 25 Panels (16 Misses, 9 Winning Symbols), First to 3 Matches Wins, Exact 95% RTP
// ============================================================================
type MultiplierType = "20x" | "10x" | "5x" | "2x" | "1x" | "miss";

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
  "1x": { type: "1x", label: "1x Refund", mult: 1, icon: "🍒", color: "#fb7185" },
  miss: { type: "miss", label: "Miss", mult: 0, icon: "❌", color: "#f43f5e" },
};

const SCRATCH_CARD_TIERS = [
  { id: "tier100", name: "100 ✦ Ticket", cost: 100, maxWin: 2000 },
  { id: "tier500", name: "500 ✦ Ticket", cost: 500, maxWin: 10000 },
  { id: "tier1000", name: "1000 ✦ Ticket", cost: 1000, maxWin: 20000 },
];

const ScratchcardGame: React.FC<GameCommonProps> = ({ astriteBalance, onUpdateAstrites }) => {
  const [selectedTier, setSelectedTier] = useState(SCRATCH_CARD_TIERS[0]);
  const [hasBought, setHasBought] = useState(false);
  const [scratched, setScratched] = useState<boolean[]>(Array(25).fill(false));
  const [gridPanels, setGridPanels] = useState<MultiplierType[]>(Array(25).fill("miss"));
  const [outcomeModal, setOutcomeModal] = useState<MinigameOutcomeData | null>(null);
  const [insufficientNeeded, setInsufficientNeeded] = useState<number | null>(null);

  // Live count of revealed multipliers
  const revealedCounts = useMemo(() => {
    const counts: Record<MultiplierType, number> = {
      "20x": 0,
      "10x": 0,
      "5x": 0,
      "2x": 0,
      "1x": 0,
      miss: 0,
    };
    gridPanels.forEach((p, idx) => {
      if (scratched[idx]) {
        counts[p]++;
      }
    });
    return counts;
  }, [gridPanels, scratched]);

  const handleBuyTicket = (tier = selectedTier) => {
    if (tier.cost > astriteBalance) {
      soundEngine.playInsufficient();
      setInsufficientNeeded(tier.cost);
      return;
    }

    soundEngine.playClick();
    onUpdateAstrites(-tier.cost);
    setSelectedTier(tier);
    setHasBought(true);
    setScratched(Array(25).fill(false));
    setOutcomeModal(null);

    // Predetermine winning symbol (Calibrated to exact 95.00% RTP):
    // 1.0% 20x (EV: 0.20), 2.5% 10x (EV: 0.25), 5.0% 5x (EV: 0.25), 7.5% 2x (EV: 0.15), 10.0% 1x (EV: 0.10), 74.0% Miss
    const rand = getCryptoRandomFloat();
    let winner: MultiplierType = "miss";
    if (rand < 0.010) winner = "20x";
    else if (rand < 0.035) winner = "10x";
    else if (rand < 0.085) winner = "5x";
    else if (rand < 0.160) winner = "2x";
    else if (rand < 0.260) winner = "1x";
    else winner = "miss";

    // 25 total positions: 16 losses (❌), 9 symbols
    const nineSymbols: MultiplierType[] = [];
    const prizeTypes: MultiplierType[] = ["20x", "10x", "5x", "2x", "1x"];

    if (winner !== "miss") {
      // 3 of winning prize
      nineSymbols.push(winner, winner, winner);
      // 6 fillers from other prizes with max 2 of any
      const otherTypes = prizeTypes.filter((t) => t !== winner);
      nineSymbols.push(otherTypes[0], otherTypes[0]);
      nineSymbols.push(otherTypes[1], otherTypes[1]);
      nineSymbols.push(otherTypes[2], otherTypes[3] || otherTypes[2]);
    } else {
      // Loss: 9 symbols with NONE reaching 3 (e.g. 2, 2, 2, 2, 1)
      nineSymbols.push(prizeTypes[0], prizeTypes[0]);
      nineSymbols.push(prizeTypes[1], prizeTypes[1]);
      nineSymbols.push(prizeTypes[2], prizeTypes[2]);
      nineSymbols.push(prizeTypes[3], prizeTypes[3]);
      nineSymbols.push(prizeTypes[4]);
    }

    // Build 25 panels: 16 misses and 9 symbols
    const fullGrid: MultiplierType[] = Array(16).fill("miss").concat(nineSymbols);

    // Cryptographic Fisher-Yates shuffle
    for (let i = fullGrid.length - 1; i > 0; i--) {
      const j = Math.floor(getCryptoRandomFloat() * (i + 1));
      [fullGrid[i], fullGrid[j]] = [fullGrid[j], fullGrid[i]];
    }

    setGridPanels(fullGrid);
  };

  const checkWinner = (updatedScratched: boolean[], panels: MultiplierType[]) => {
    const counts: Record<MultiplierType, number> = {
      "20x": 0,
      "10x": 0,
      "5x": 0,
      "2x": 0,
      "1x": 0,
      miss: 0,
    };
    for (let i = 0; i < 25; i++) {
      if (updatedScratched[i]) {
        const type = panels[i];
        counts[type]++;
        if (type !== "miss" && counts[type] >= 3) {
          // Found first 3-of-a-kind prize!
          const def = MULTIPLIER_DEFS[type];

          // 450ms inspection delay
          setTimeout(() => {
            if (def.mult > 1) {
              const payout = selectedTier.cost * def.mult;
              onUpdateAstrites(payout);
              soundEngine.playAstriteGain();
              setOutcomeModal({
                type: "win",
                title: "WIN!",
                landedTitle: "Result",
                landedValue: `${def.icon} ${def.mult}x`,
                landedColor: def.color,
                betTitle: "Ticket",
                betValue: `${selectedTier.cost.toLocaleString()} ✦`,
                deltaAmount: payout,
                multiplier: `${def.mult}x`,
              });
            } else if (def.mult === 1) {
              onUpdateAstrites(selectedTier.cost);
              soundEngine.playAstriteGain();
              setOutcomeModal({
                type: "push",
                title: "REFUND",
                landedTitle: "Result",
                landedValue: `${def.icon} 1.0x`,
                landedColor: def.color,
                betTitle: "Ticket",
                betValue: `${selectedTier.cost.toLocaleString()} ✦`,
                deltaAmount: 0,
                multiplier: "1.0x Refund",
              });
            }
          }, 450);
          return true;
        }
      }
    }

    // If all 25 panels scratched and no prize reached 3: Loss
    const allRevealed = updatedScratched.every((s) => s);
    if (allRevealed) {
      setTimeout(() => {
        soundEngine.playMissWhoosh();
        setOutcomeModal({
          type: "loss",
          title: "LOSE",
          landedTitle: "Result",
          landedValue: "❌ No 3-Match",
          landedColor: "#f43f5e",
          betTitle: "Ticket",
          betValue: `${selectedTier.cost.toLocaleString()} ✦`,
          deltaAmount: -selectedTier.cost,
        });
      }, 450);
      return true;
    }

    return false;
  };

  const handleScratchPanel = (index: number) => {
    if (!hasBought || scratched[index] || outcomeModal) return;
    soundEngine.playClick();
    const updated = [...scratched];
    updated[index] = true;
    setScratched(updated);
    checkWinner(updated, gridPanels);
  };

  const handleScratchAll = () => {
    if (!hasBought || outcomeModal) return;
    soundEngine.playClick();
    const allScratched = Array(25).fill(true);
    setScratched(allScratched);
    checkWinner(allScratched, gridPanels);
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center space-y-4 text-center relative">
      <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-200/90 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 text-left">
          <Ticket className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span>
            <strong>Lupa:</strong> "5×5 Card! 3 matching symbols of any tier wins that prize!"
          </span>
        </div>
        <span className="text-[10px] font-mono text-orange-300 font-bold uppercase">
          5×5 Match 3
        </span>
      </div>

      {/* Ticket Selection Tiers */}
      {!hasBought && (
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {SCRATCH_CARD_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => handleBuyTicket(tier)}
              className="p-3.5 rounded-xl border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-black/40 hover:from-amber-500/30 text-center space-y-1 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Ticket className="w-6 h-6 text-amber-300 mx-auto" />
              <p className="text-xs font-mono font-bold text-white">{tier.name}</p>
              <p className="text-sm font-mono font-black text-yellow-300">{tier.cost} Astrites</p>
              <p className="text-[10px] font-mono text-gray-400">Win up to {tier.maxWin.toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}

      {/* Active 5×5 Scratchcard Arena */}
      {hasBought && (
        <div className="w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#130f1e] to-black border-2 border-amber-400/50 shadow-2xl space-y-3.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-amber-300 uppercase">{selectedTier.name} (5×5)</span>
            <button
              type="button"
              onClick={handleScratchAll}
              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-yellow-300 text-black text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Scratch All Panels
            </button>
          </div>

          {/* Live Multiplier Tracker Bar */}
          <div className="grid grid-cols-5 gap-1.5 p-2 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono">
            {(["20x", "10x", "5x", "2x", "1x"] as MultiplierType[]).map((type) => {
              const def = MULTIPLIER_DEFS[type];
              const count = revealedCounts[type];
              return (
                <div key={type} className="flex flex-col items-center p-1 rounded bg-white/5">
                  <div className="flex items-center space-x-1 font-bold" style={{ color: def.color }}>
                    <span>{def.icon}</span>
                    <span>{def.mult}x</span>
                  </div>
                  <div className="flex space-x-1 mt-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full border ${
                          i < count
                            ? "bg-yellow-400 border-yellow-300 shadow-[0_0_6px_rgba(250,204,21,0.8)]"
                            : "bg-white/10 border-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5×5 Grid (25 Panels: 16 Misses, 9 Symbols) */}
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
                        : "bg-[#0c1424] border-amber-400/40 shadow-inner"
                      : "bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 border-yellow-200 text-amber-950 shadow-md hover:brightness-110 active:scale-95"
                  }`}
                >
                  {isRevealed ? (
                    <div className="flex flex-col items-center">
                      <span className="text-xl sm:text-2xl">{def.icon}</span>
                      <span className="text-[10px] font-mono font-black" style={{ color: def.color }}>
                        {def.mult > 0 ? `${def.mult}x` : "MISS"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono font-black tracking-wider uppercase drop-shadow">
                      ✦
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setHasBought(false)}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all cursor-pointer"
          >
            Buy Another Card
          </button>
        </div>
      )}

      <MinigameOutcomeModal
        outcome={outcomeModal}
        onPlayAgain={() => {
          setOutcomeModal(null);
          handleBuyTicket(selectedTier);
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
