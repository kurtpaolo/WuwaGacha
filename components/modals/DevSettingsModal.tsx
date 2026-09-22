"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Volume2,
  Music,
  Sparkles,
  Smartphone,
  Zap,
  Check,
  Share,
  PlusSquare,
  HelpCircle,
  Bell,
  Trash2,
  Send,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface DiscordWebhookItem {
  id: string;
  url: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface DevSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSandbox?: boolean;
  onToggleSandbox?: (enabled: boolean) => void;
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [masterVol, setMasterVol] = useState<number>(() => Math.round(soundEngine.getMasterVolume() * 100));
  const [musicVol, setMusicVol] = useState<number>(() => Math.round(soundEngine.getMusicVolume() * 100));
  const [summonVol, setSummonVol] = useState<number>(() => Math.round(soundEngine.getSummonVolume() * 100));

  // Fast Convene mode state
  const [fastConvene, setFastConvene] = useState<boolean>(false);

  // Auto-Activate Sequences mode state (default: false / manual)
  const [autoActivate, setAutoActivate] = useState<boolean>(false);

  // PWA Add to Home Screen states
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  // Discord Webhooks state
  const [webhooks, setWebhooks] = useState<DiscordWebhookItem[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState<boolean>(false);
  const [isAddingWebhook, setIsAddingWebhook] = useState<boolean>(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);
  const [isBroadcastingAll, setIsBroadcastingAll] = useState<boolean>(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState<string>("");
  const [newWebhookName, setNewWebhookName] = useState<string>("");
  const [webhookStatus, setWebhookStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFastConvene(localStorage.getItem("wuwa_fast_convene") === "true");
      setAutoActivate(localStorage.getItem("wuwa_auto_activate_sequences") === "true");

      const checkStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(Boolean(checkStandalone));

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, [isOpen]);

  const handleToggleFastConvene = (val: boolean) => {
    soundEngine.playClick();
    setFastConvene(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wuwa_fast_convene", String(val));
    }
  };

  const handleToggleAutoActivate = (val: boolean) => {
    soundEngine.playClick();
    setAutoActivate(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wuwa_auto_activate_sequences", String(val));
      window.dispatchEvent(new Event("wuwa_auto_activate_changed"));
    }
  };

  const handleInstallClick = async () => {
    soundEngine.playClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      setShowIOSGuide((prev) => !prev);
    }
  };

  const isMuted = masterVol === 0;
  const prevMasterVolRef = useRef<number>(masterVol > 0 ? masterVol : 80);

  useEffect(() => {
    if (isOpen) {
      const currentMaster = Math.round(soundEngine.getMasterVolume() * 100);
      setMasterVol(currentMaster);
      if (currentMaster > 0) {
        prevMasterVolRef.current = currentMaster;
      }
      setMusicVol(Math.round(soundEngine.getMusicVolume() * 100));
      setSummonVol(Math.round(soundEngine.getSummonVolume() * 100));
    }
  }, [isOpen]);

  const handleMasterChange = (val: number) => {
    if (val > 0) {
      prevMasterVolRef.current = val;
    }
    setMasterVol(val);
    soundEngine.setMasterVolume(val / 100);
  };

  const handleToggleMuteAll = () => {
    soundEngine.playClick();
    if (isMuted) {
      const restore = prevMasterVolRef.current > 0 ? prevMasterVolRef.current : 80;
      handleMasterChange(restore);
    } else {
      prevMasterVolRef.current = masterVol > 0 ? masterVol : 80;
      handleMasterChange(0);
    }
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    soundEngine.setMusicVolume(val / 100);
  };

  const handleSummonChange = (val: number) => {
    setSummonVol(val);
    soundEngine.setSummonVolume(val / 100);
  };

  const fetchWebhooks = async () => {
    setIsLoadingWebhooks(true);
    try {
      const res = await fetch("/api/webhooks");
      const json = await res.json();
      if (json.success && Array.isArray(json.webhooks)) {
        setWebhooks(json.webhooks);
      }
    } catch (err) {
      console.error("Failed to fetch webhooks:", err);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWebhooks();
    }
  }, [isOpen]);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;

    soundEngine.playClick();
    setIsAddingWebhook(true);
    setWebhookStatus(null);

    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newWebhookUrl.trim(),
          name: newWebhookName.trim() || "Discord Channel",
        }),
      });
      const data = await res.json();

      if (data.success && data.webhook) {
        setWebhooks((prev) => [...prev, data.webhook]);
        setNewWebhookUrl("");
        setNewWebhookName("");
        setWebhookStatus({
          type: "success",
          message: "Webhook added successfully!",
        });
      } else {
        setWebhookStatus({
          type: "error",
          message: data.error || "Failed to add webhook.",
        });
      }
    } catch (err: any) {
      setWebhookStatus({
        type: "error",
        message: err.message || "Failed to add webhook.",
      });
    } finally {
      setIsAddingWebhook(false);
    }
  };

  const handleToggleWebhook = async (id: string, currentActive: boolean) => {
    soundEngine.playClick();
    try {
      const res = await fetch("/api/webhooks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === id ? { ...w, is_active: !currentActive } : w))
        );
      }
    } catch (err) {
      console.error("Failed to toggle webhook:", err);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    soundEngine.playClick();
    setDeletingWebhookId(id);
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete webhook:", err);
    } finally {
      setDeletingWebhookId(null);
    }
  };

  const handleTestWebhook = async (id: string, url: string) => {
    soundEngine.playClick();
    setTestingWebhookId(id);
    setWebhookStatus(null);
    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) {
        setWebhookStatus({
          type: "success",
          message: data.message || "Test banner notification sent to Discord!",
        });
      } else {
        setWebhookStatus({
          type: "error",
          message: data.error || "Failed to send test notification.",
        });
      }
    } catch (err: any) {
      setWebhookStatus({
        type: "error",
        message: err.message || "Failed to send test notification.",
      });
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleBroadcastAll = async () => {
    soundEngine.playClick();
    setIsBroadcastingAll(true);
    setWebhookStatus(null);
    try {
      const res = await fetch("/api/banner/broadcast?force=true", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setWebhookStatus({
          type: "success",
          message: data.message || `Broadcast completed (${data.dispatched} sent).`,
        });
      } else {
        setWebhookStatus({
          type: "error",
          message: data.error || "Failed to broadcast to webhooks.",
        });
      }
    } catch (err: any) {
      setWebhookStatus({
        type: "error",
        message: err.message || "Failed to broadcast to webhooks.",
      });
    } finally {
      setIsBroadcastingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/95 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1119] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]"
        >
          {/* Header: Just Settings */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Settings className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white font-display">
                Settings
              </h2>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="relative p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* ========================================================================= */}
            {/* 1. VOLUME SECTION (AT THE VERY TOP) */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                    Audio & Volume
                  </span>
                </div>

                {/* Mute All small toggle at the very right of Audio & Volume */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                    Mute All
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleMuteAll}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isMuted ? "bg-rose-500" : "bg-white/15"
                    }`}
                    title={isMuted ? "Unmute Audio" : "Mute All Audio"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isMuted ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Master Volume */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                    <Volume2 className="w-4 h-4 text-gray-300" />
                    <span>Master Volume</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-400 min-w-[40px] text-right">
                    {masterVol}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVol}
                  onChange={(e) => handleMasterChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                />
              </div>

              {/* Music Volume (wuwamenu BGM) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                    <Music className="w-4 h-4 text-gray-300" />
                    <span>Music Volume</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-400 min-w-[40px] text-right">
                    {musicVol}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono">
                  Background Music
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVol}
                  onChange={(e) => handleMusicChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                />
              </div>

              {/* Summon Volume (all cutscenes & reveal stingers) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-gray-300" />
                    <span>Summon Volume</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-400 min-w-[40px] text-right">
                    {summonVol}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono">
                  Summons and character cutscenes
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={summonVol}
                  onChange={(e) => handleSummonChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. GACHA CONVENE SETTINGS */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                  Convene Experience
                </span>
              </div>

              {/* Fast Convene Toggle */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Skip Fodder Pulls</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Instantly Skip 3★ and 4★ pulls
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFastConvene(!fastConvene)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      fastConvene ? "bg-yellow-400" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        fastConvene ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Auto-Activate Sequences Toggle */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Auto-Activate Sequences</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Automatically activates Resonance Chain nodes when pulling duplicate 5★ resonators.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAutoActivate(!autoActivate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoActivate ? "bg-yellow-400" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoActivate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. DISCORD WEBHOOK NOTIFICATIONS */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Bell className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                  Discord Webhooks
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-white tracking-wide">
                    Banner Rotation Notifications
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Broadcast current 5★ banner resonators & artwork to Discord every 30 minutes (:00, :30).
                  </p>
                </div>

                {/* Status Message (success / error) */}
                {webhookStatus && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-mono flex items-center space-x-2 ${
                      webhookStatus.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {webhookStatus.type === "success" ? (
                      <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{webhookStatus.message}</span>
                  </div>
                )}

                {/* Add Webhook Form */}
                <form onSubmit={handleAddWebhook} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-400 transition-colors"
                      disabled={isAddingWebhook}
                    />
                    <input
                      type="text"
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                      placeholder="Channel (optional)"
                      className="sm:w-36 bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-400 transition-colors"
                      disabled={isAddingWebhook}
                    />
                    <button
                      type="submit"
                      disabled={isAddingWebhook || !newWebhookUrl.trim()}
                      className="inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
                    >
                      {isAddingWebhook ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Auto-Broadcast Schedule Banner & Manual Dispatch */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-yellow-400/5 border border-yellow-400/20 text-[11px] font-mono">
                  <div className="flex items-center space-x-1.5 text-yellow-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Auto-broadcasts every <strong>:00</strong> and <strong>:30</strong> (GMT+8)</span>
                  </div>
                  {webhooks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBroadcastAll}
                      disabled={isBroadcastingAll}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      title="Trigger banner broadcast to all active webhooks right now"
                    >
                      {isBroadcastingAll ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Broadcast Now</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* List of Webhooks */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  {isLoadingWebhooks ? (
                    <div className="flex items-center justify-center py-4 text-xs font-mono text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading webhooks...
                    </div>
                  ) : webhooks.length === 0 ? (
                    <p className="text-[11px] text-gray-500 font-mono py-2 text-center">
                      No webhooks configured. Add one above to receive banner notifications.
                    </p>
                  ) : (
                    webhooks.map((hook) => {
                      const isTesting = testingWebhookId === hook.id;
                      const isDeleting = deletingWebhookId === hook.id;
                      const maskedUrl =
                        hook.url.length > 40
                          ? `${hook.url.slice(0, 30)}...${hook.url.slice(-8)}`
                          : hook.url;

                      return (
                        <div
                          key={hook.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-black/30 border border-white/10 gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white truncate">
                                {hook.name}
                              </span>
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  hook.is_active ? "bg-emerald-400" : "bg-gray-500"
                                }`}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono truncate block">
                              {maskedUrl}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {/* Active Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleWebhook(hook.id, hook.is_active)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                hook.is_active ? "bg-yellow-400" : "bg-white/15"
                              }`}
                              title={hook.is_active ? "Disable Webhook" : "Enable Webhook"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full ${
                                  hook.is_active ? "bg-black" : "bg-white"
                                } shadow ring-0 transition duration-200 ease-in-out ${
                                  hook.is_active ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>

                            {/* Test Webhook Button */}
                            <button
                              type="button"
                              onClick={() => handleTestWebhook(hook.id, hook.url)}
                              disabled={isTesting}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Send Test Notification"
                            >
                              {isTesting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete Webhook Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteWebhook(hook.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Webhook"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 4. APP & DEVICE (PWA ADD TO HOME SCREEN) */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Smartphone className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                  App & Device
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold uppercase text-white tracking-wide">
                      Standalone App Mode
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Play full-screen without browser address bars or navigation.
                    </p>
                  </div>

                  {isStandalone ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>App Installed</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-95 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Add to Home Screen</span>
                    </button>
                  )}
                </div>

                {/* iOS / Safari Manual Instructions Dropdown */}
                {showIOSGuide && !isStandalone && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 space-y-2 text-left"
                  >
                    <div className="flex items-center space-x-1.5 text-yellow-400 text-xs font-bold">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>How to Install on iPhone / iPad / Safari:</span>
                    </div>
                    <ol className="text-[11px] text-gray-300 font-mono space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>
                        Tap the <strong className="text-white inline-flex items-center px-1 py-0.5 rounded bg-white/10"><Share className="w-3 h-3 inline mr-1 text-yellow-400" /> Share</strong> button in Safari's bottom toolbar.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-white inline-flex items-center px-1 py-0.5 rounded bg-white/10"><PlusSquare className="w-3 h-3 inline mr-1 text-yellow-400" /> Add to Home Screen</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-yellow-400">Add</strong> in the top-right corner to launch directly from your home screen.
                      </li>
                    </ol>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
