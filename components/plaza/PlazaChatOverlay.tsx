"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { PlazaChatMessage } from "@/lib/plaza/plazaTypes";
import { Send, MessageSquare, X } from "lucide-react";
import { MILESTONE_TITLES, RESONATOR_COLORS } from "@/lib/data/titles";

interface PlazaChatOverlayProps {
  messages: PlazaChatMessage[];
  onSendMessage: (text: string) => boolean;
  onSendEmote?: (emoji: string) => void;
  onlineCount?: number;
  currentLobbyId?: number;
  onSwitchLobby?: (lobbyId: number) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function getTitleColor(titleName?: string): string {
  if (!titleName) return "#FBBF24"; // Default gold/yellow-400

  // Check milestone titles
  const foundMilestone = MILESTONE_TITLES.find(
    (t) => t.name.toLowerCase() === titleName.toLowerCase() || t.id.toLowerCase() === titleName.toLowerCase()
  );
  if (foundMilestone) {
    if (foundMilestone.customColor) return foundMilestone.customColor;
    if (foundMilestone.rarity === "mythic") return "#EF4444"; // red
    if (foundMilestone.rarity === "legendary") return "#FBBF24"; // yellow/gold
    if (foundMilestone.rarity === "epic") return "#C084FC"; // purple
    if (foundMilestone.rarity === "rare") return "#60A5FA"; // blue
  }

  // Check resonator colors
  const key = titleName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  for (const [resKey, color] of Object.entries(RESONATOR_COLORS)) {
    if (key.includes(resKey) || resKey.includes(key)) {
      return color;
    }
  }

  return "#FBBF24";
}

const MESSAGE_LIFETIME_MS = 10000; // 10 seconds auto-fade in HUD mode

export const PlazaChatOverlay: React.FC<PlazaChatOverlayProps> = ({
  messages,
  onSendMessage,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  // History is hidden by default
  const [internalShowHistory, setInternalShowHistory] = useState<boolean>(false);
  const showHistory = controlledIsOpen !== undefined ? controlledIsOpen : internalShowHistory;

  const setShowHistory = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof val === "function" ? val(showHistory) : val;
      if (onOpenChange) {
        onOpenChange(nextVal);
      } else {
        setInternalShowHistory(nextVal);
      }
    },
    [onOpenChange, showHistory]
  );

  const [inputText, setInputText] = useState("");
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Timestamps for messages to manage 10-second decay
  const messageTimestampsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const now = Date.now();
    for (const msg of messages) {
      if (!messageTimestampsRef.current.has(msg.id)) {
        messageTimestampsRef.current.set(msg.id, now);
      }
    }
  }, [messages]);

  // Periodic ticker to trigger re-renders as messages expire
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Filter messages for temporary HUD (last 10 seconds)
  const hudMessages = messages
    .filter((msg) => {
      const bornAt = messageTimestampsRef.current.get(msg.id) || 0;
      return currentTime - bornAt < MESSAGE_LIFETIME_MS;
    })
    .slice(-5);

  // Auto-scroll when new messages arrive or when opening history
  useEffect(() => {
    if (showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showHistory]);

  // Listen for global custom events from keyboard shortcuts
  useEffect(() => {
    const handleToggleHistory = () => {
      soundEngine.playClick();
      setShowHistory((prev) => !prev);
    };

    const handleFocusInput = () => {
      inputRef.current?.focus();
    };

    const handleOpenChat = () => {
      setShowHistory(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    };

    window.addEventListener("wuwa_toggle_plaza_chat_history", handleToggleHistory);
    window.addEventListener("wuwa_focus_plaza_chat_input", handleFocusInput);
    window.addEventListener("wuwa_open_plaza_chat", handleOpenChat);

    return () => {
      window.removeEventListener("wuwa_toggle_plaza_chat_history", handleToggleHistory);
      window.removeEventListener("wuwa_focus_plaza_chat_input", handleFocusInput);
      window.removeEventListener("wuwa_open_plaza_chat", handleOpenChat);
    };
  }, [setShowHistory]);

  // Handle Escape key and outside click to close history and blur input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showHistory || document.activeElement === inputRef.current) {
          e.preventDefault();
          setShowHistory(false);
          inputRef.current?.blur();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (showHistory) {
          setShowHistory(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHistory, setShowHistory]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      // Empty submit blurs input
      inputRef.current?.blur();
      return;
    }

    const sent = onSendMessage(inputText);
    if (sent) {
      soundEngine.playClick();
      setInputText("");
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 w-72 sm:w-80 md:w-96 max-w-[calc(100vw-32px)] pointer-events-auto flex flex-col select-none"
    >
      {/* ========================================================================= */}
      {/* 1. EXPANDABLE CHAT HISTORY (Hidden by default, toggled with T or button) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.85)] p-2.5 sm:p-3 space-y-2 mb-2"
          >
            {/* History Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 px-1">
              <div className="flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Plaza Chat History
                </span>
                <span className="text-[10px] font-mono text-gray-400">({messages.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowHistory(false);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Hide History (Esc or T)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable Chat History Container */}
            <div className="flex flex-col space-y-1.5 max-h-52 sm:max-h-60 overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-yellow-400/30">
              {messages.length === 0 ? (
                <p className="text-[11px] font-mono text-gray-500 italic py-4 text-center">
                  No messages yet. Say hello to Biñan!
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="w-full px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono leading-snug break-words transition-colors"
                  >
                    <span
                      style={{ color: getTitleColor(msg.senderTitle) }}
                      className="font-bold mr-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    >
                      {msg.senderName}:
                    </span>
                    <span className="text-gray-100 font-medium">{msg.text}</span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. RECENT HUD MESSAGES (When history is collapsed, show last 10s fading)  */}
      {/* ========================================================================= */}
      {!showHistory && hudMessages.length > 0 && (
        <div className="flex flex-col space-y-1 mb-2 pointer-events-none">
          {hudMessages.map((msg) => {
            const bornAt = messageTimestampsRef.current.get(msg.id) || currentTime;
            const age = currentTime - bornAt;
            const remaining = MESSAGE_LIFETIME_MS - age;
            const opacity = remaining < 2000 ? Math.max(0.1, remaining / 2000) : 1;

            return (
              <div
                key={msg.id}
                style={{ opacity }}
                className="w-fit max-w-full px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs border border-white/10 text-xs font-mono leading-snug shadow-md break-words transition-opacity duration-300"
              >
                <span
                  style={{ color: getTitleColor(msg.senderTitle) }}
                  className="font-bold mr-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  {msg.senderName}:
                </span>
                <span className="text-gray-100 font-medium">{msg.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PERMANENT CHAT INPUT BAR (Always visible at bottom-left!)               */}
      {/* ========================================================================= */}
      <form
        onSubmit={handleSend}
        className="flex items-center space-x-1.5 bg-black/80 hover:bg-black/90 focus-within:bg-black/95 backdrop-blur-md border border-white/20 focus-within:border-yellow-400/80 rounded-xl px-2 py-1.5 shadow-2xl transition-all"
      >
        {/* Toggle History Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setShowHistory((prev) => !prev);
          }}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
            showHistory
              ? "bg-yellow-400/25 border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
          title="Toggle Chat History (T)"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Chat... (Enter to send, T for history)"
          maxLength={120}
          className="flex-1 bg-transparent border-none px-1.5 py-0.5 text-xs text-white placeholder-gray-400 font-mono outline-none"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 disabled:pointer-events-none text-black transition-all active:scale-95 cursor-pointer shadow-sm flex-shrink-0"
          title="Send (Enter)"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
