"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isInteractive = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const setIsInteractive = useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalIsOpen(open);
      }
    },
    [onOpenChange]
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

  // Filter messages for temporary Minecraft-style HUD (last 10 seconds)
  const hudMessages = messages
    .filter((msg) => {
      const bornAt = messageTimestampsRef.current.get(msg.id) || 0;
      return currentTime - bornAt < MESSAGE_LIFETIME_MS;
    })
    .slice(-6);

  // Auto-scroll when new messages arrive or when opening chat
  useEffect(() => {
    if (isInteractive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isInteractive]);

  // Focus input when interactive mode opens
  useEffect(() => {
    if (isInteractive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isInteractive]);

  // Listen for global custom event to open chat (e.g. from 'T' shortcut in JinzhouPlaza)
  useEffect(() => {
    const handleOpenChatEvent = () => {
      setIsInteractive(true);
    };
    window.addEventListener("wuwa_open_plaza_chat", handleOpenChatEvent);
    return () => window.removeEventListener("wuwa_open_plaza_chat", handleOpenChatEvent);
  }, [setIsInteractive]);

  // Handle escape key and click outside to close interactive mode
  useEffect(() => {
    if (!isInteractive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsInteractive(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsInteractive(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isInteractive, setIsInteractive]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      // Empty enter closes chat (like Minecraft)
      setIsInteractive(false);
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
      {/* MODE 1: INTERACTIVE CHAT WINDOW (Open Mode - Press 'T' or Click)         */}
      {/* ========================================================================= */}
      {isInteractive ? (
        <div className="flex flex-col bg-black/85 backdrop-blur-md rounded-2xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.85)] p-2.5 sm:p-3 space-y-2 animate-scale-up">
          {/* Header with Title and Close Button */}
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10 px-1">
            <div className="flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Plaza Chat
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsInteractive(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Persistent Scrollable Chat History Container */}
          <div className="flex flex-col space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-yellow-400/30">
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

          {/* Focused Chat Input Form at Bottom */}
          <form
            onSubmit={handleSend}
            className="flex items-center space-x-1.5 bg-black/60 border border-white/20 rounded-xl px-2 py-1 shadow-inner"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message... (Esc to close)"
              maxLength={120}
              className="flex-1 bg-transparent border-none px-1 py-0.5 text-xs text-white placeholder-gray-400 font-mono outline-none"
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
      ) : (
        /* ========================================================================= */
        /* MODE 2: TEMPORARY 10-SECOND AUTO-FADING HUD FEED (Normal Gameplay)        */
        /* ========================================================================= */
        <div
          onClick={() => setIsInteractive(true)}
          className="flex flex-col space-y-1 cursor-pointer group"
          title="Click or press 'T' to open chat"
        >
          {hudMessages.map((msg) => {
            const bornAt = messageTimestampsRef.current.get(msg.id) || currentTime;
            const age = currentTime - bornAt;
            const remaining = MESSAGE_LIFETIME_MS - age;
            const opacity = remaining < 2000 ? Math.max(0.1, remaining / 2000) : 1;

            return (
              <div
                key={msg.id}
                style={{ opacity }}
                className="w-fit max-w-full px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs border border-white/10 text-xs font-mono leading-snug shadow-md break-words transition-opacity duration-300 group-hover:opacity-100"
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

          {/* Subtle Prompt Indicator when hovering or when messages exist */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-gray-400 pl-1 pt-0.5">
            Press <span className="text-yellow-400 font-bold">T</span> or click to chat
          </div>
        </div>
      )}
    </div>
  );
};
