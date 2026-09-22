"use client";

import React, { useState, useRef, useEffect } from "react";
import { soundEngine } from "@/lib/audio/soundEngine";
import { PlazaChatMessage } from "@/lib/plaza/plazaTypes";
import { Send } from "lucide-react";
import { MILESTONE_TITLES, RESONATOR_COLORS } from "@/lib/data/titles";

interface PlazaChatOverlayProps {
  messages: PlazaChatMessage[];
  onSendMessage: (text: string) => boolean;
  onSendEmote?: (emoji: string) => void;
  onlineCount?: number;
  currentLobbyId?: number;
  onSwitchLobby?: (lobbyId: number) => void;
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

export const PlazaChatOverlay: React.FC<PlazaChatOverlayProps> = ({
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Roblox / Minecraft style: show up to 5 most recent messages
  const visibleMessages = messages.slice(-5);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const sent = onSendMessage(inputText);
    if (sent) {
      soundEngine.playClick();
      setInputText("");
    }
  };

  return (
    <div className="fixed bottom-6 left-6 sm:bottom-7 sm:left-7 z-40 w-64 sm:w-72 max-w-[calc(100vw-140px)] pointer-events-auto flex flex-col space-y-1.5">
      {/* Floating 5 Messages (Roblox / Minecraft style) */}
      <div className="flex flex-col space-y-1 pointer-events-none">
        {visibleMessages.map((msg) => (
          <div
            key={msg.id}
            className="w-fit max-w-full px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs border border-white/10 text-xs font-mono leading-snug shadow-md break-words pointer-events-auto"
          >
            <span
              style={{ color: getTitleColor(msg.senderTitle) }}
              className="font-bold mr-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              {msg.senderName}:
            </span>
            <span className="text-gray-100 font-medium">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Shortened Chat Input Field (No Emoji Button) */}
      <form
        onSubmit={handleSend}
        className="flex items-center space-x-1.5 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-2 py-1 shadow-lg pointer-events-auto"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={100}
          className="flex-1 bg-transparent border-none px-1 py-0.5 text-xs text-white placeholder-gray-400 font-mono outline-none"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-30 disabled:pointer-events-none text-black transition-all active:scale-95 cursor-pointer shadow-sm flex-shrink-0"
          title="Send"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
