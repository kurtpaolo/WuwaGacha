"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Pencil,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Search,
  Camera,
  ArrowLeft,
  ShieldCheck,
  Cake,
  Calendar,
  Clock,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  updateUserUsername,
  updateUserPassword,
  updateUserAvatar,
  getPreviousUsernames,
  getUsernameCooldownRemainingMs,
  getPasswordCooldownRemainingMs,
  updateUserBirthday,
  calculateAge,
  getBirthdayCooldownRemainingMs,
} from "@/lib/supabase/auth";
import { triggerSlowDownModal } from "@/components/modals/SlowDownModal";
import { INVENTORY_PORTRAITS, getPortraitFileName, DEFAULT_AVATAR_ID } from "@/lib/data/portraits";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  userId: string;
  currentUsername: string;
  currentAvatarId: string;
  createdAt?: string;
  currentBirthday?: string;
  birthdayLastChangedAt?: string;
  onUsernameChanged: (newUsername: string) => void;
  onAvatarChanged: (newAvatarId: string) => void;
  onBirthdayChanged?: (newBirthday: string, newChangedAt: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onBack,
  userId,
  currentUsername,
  currentAvatarId,
  createdAt,
  currentBirthday,
  birthdayLastChangedAt,
  onUsernameChanged,
  onAvatarChanged,
  onBirthdayChanged,
}) => {
  // Avatar Selection State
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarSearch, setAvatarSearch] = useState("");
  const [tempSelectedAvatar, setTempSelectedAvatar] = useState(currentAvatarId || DEFAULT_AVATAR_ID);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Username Editing State
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState(currentUsername);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  // Password Editing State
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Birthday Editing State & Cooldown (24 hours)
  const [birthdayVal, setBirthdayVal] = useState<string>(currentBirthday || "");
  const [birthdayLastChanged, setBirthdayLastChanged] = useState<string | undefined>(birthdayLastChangedAt);
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState(currentBirthday || "");
  const [birthdayLoading, setBirthdayLoading] = useState(false);
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [birthdaySuccess, setBirthdaySuccess] = useState(false);

  // Calculate birthday 24h cooldown
  const birthdayCooldownMs = getBirthdayCooldownRemainingMs(birthdayLastChanged);
  const isBirthdayCooldownActive = birthdayCooldownMs > 0;
  const birthdayCooldownHours = Math.floor(birthdayCooldownMs / (1000 * 60 * 60));
  const birthdayCooldownMinutes = Math.floor((birthdayCooldownMs % (1000 * 60 * 60)) / (1000 * 60));

  // Previous Usernames
  const [previousUsernames, setPreviousUsernames] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNewUsernameInput(currentUsername);
      setIsEditingUsername(false);
      setUsernameError(null);
      setUsernameSuccess(false);

      setTempSelectedAvatar(currentAvatarId || DEFAULT_AVATAR_ID);
      setIsAvatarPickerOpen(false);
      setAvatarSearch("");

      setIsEditingPassword(false);
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setPasswordError(null);
      setPasswordSuccess(false);

      setBirthdayVal(currentBirthday || "");
      setBirthdayLastChanged(birthdayLastChangedAt);
      setIsEditingBirthday(false);
      setBirthdayInput(currentBirthday || "");
      setBirthdayError(null);
      setBirthdaySuccess(false);

      if (userId) {
        setPreviousUsernames(getPreviousUsernames(userId));
      }
    }
  }, [isOpen, currentUsername, currentAvatarId, currentBirthday, birthdayLastChangedAt, userId]);

  // Filtered portraits for avatar picker
  const filteredPortraits = useMemo(() => {
    if (!avatarSearch.trim()) return INVENTORY_PORTRAITS;
    const q = avatarSearch.toLowerCase().trim();
    return INVENTORY_PORTRAITS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }, [avatarSearch]);

  if (!isOpen) return null;

  // Handle Avatar Confirmation
  const handleConfirmAvatar = async (avatarId: string) => {
    soundEngine.playClick();
    setAvatarSaving(true);
    try {
      await updateUserAvatar(userId, avatarId);
      onAvatarChanged(avatarId);
      setIsAvatarPickerOpen(false);
    } catch (err) {
      console.error("Failed to update avatar:", err);
    } finally {
      setAvatarSaving(false);
    }
  };

  // Handle Username Save
  const handleSaveUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    soundEngine.playClick();
    setUsernameError(null);
    setUsernameSuccess(false);

    const trimmed = newUsernameInput.trim();
    if (!trimmed) {
      setUsernameError("Username cannot be empty.");
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters long.");
      return;
    }
    if (trimmed.length > 20) {
      setUsernameError("Username must not exceed 20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setUsernameError("Username can only contain letters, numbers, hyphens, and underscores.");
      return;
    }

    if (trimmed.toLowerCase() === currentUsername.toLowerCase()) {
      setIsEditingUsername(false);
      return;
    }

    setUsernameLoading(true);
    try {
      const result = await updateUserUsername(userId, currentUsername, trimmed);
      if (result.success && result.updatedUsername) {
        setUsernameSuccess(true);
        if (result.previousUsernames) {
          setPreviousUsernames(result.previousUsernames);
        }
        onUsernameChanged(result.updatedUsername);
        setTimeout(() => {
          setIsEditingUsername(false);
          setUsernameSuccess(false);
        }, 1200);
      } else {
        setUsernameError(result.error || "Failed to update username.");
      }
    } catch (err: any) {
      setUsernameError(err.message || "An unexpected error occurred.");
    } finally {
      setUsernameLoading(false);
    }
  };

  // Handle Password Save
  const handleSavePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    soundEngine.playClick();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPasswordInput) {
      setPasswordError("New password cannot be empty.");
      return;
    }
    if (newPasswordInput.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const result = await updateUserPassword(
        newPasswordInput,
        currentPasswordInput.trim() || undefined,
        userId
      );

      if (result.success) {
        setPasswordSuccess(true);
        setCurrentPasswordInput("");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
        setTimeout(() => {
          setIsEditingPassword(false);
          setPasswordSuccess(false);
        }, 1500);
      } else {
        setPasswordError(result.error || "Failed to update password.");
      }
    } catch (err: any) {
      setPasswordError(err.message || "An unexpected error occurred.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Birthday Save with 24-Hour Cooldown
  const handleSaveBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    setBirthdayError(null);
    setBirthdaySuccess(false);

    const cleanDate = birthdayInput.trim();
    if (!cleanDate) {
      setBirthdayError("Please select a date of birth.");
      return;
    }

    if (isBirthdayCooldownActive) {
      setBirthdayError(
        `Cooldown active: You can change your birthday again in ${birthdayCooldownHours}h ${birthdayCooldownMinutes}m.`
      );
      return;
    }

    setBirthdayLoading(true);
    try {
      const res = await updateUserBirthday(userId, cleanDate);
      if (!res.success) {
        setBirthdayError(res.error || "Failed to update birthday.");
      } else {
        const newLastChanged = res.lastChangedAt || new Date().toISOString();
        setBirthdayVal(cleanDate);
        setBirthdayLastChanged(newLastChanged);
        if (onBirthdayChanged) {
          onBirthdayChanged(cleanDate, newLastChanged);
        }
        setBirthdaySuccess(true);
        setTimeout(() => {
          setBirthdaySuccess(false);
          setIsEditingBirthday(false);
        }, 1800);
      }
    } catch (err: any) {
      setBirthdayError(err.message || "Failed to update birthday.");
    } finally {
      setBirthdayLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-lg bg-[#0c1017] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onBack();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white flex items-center space-x-1.5 text-xs font-mono font-bold transition-all mr-1 active:scale-95"
                  title="Back to Profile"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Account info
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Manage your credentials and profile picture
                </p>
              </div>
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

          {/* Body Content */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* Top User Profile Summary Badge with Circular Avatar + Edit Button */}
            <div className="flex items-center space-x-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
              {/* Profile Circle with small edit button at bottom right */}
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.3)] bg-black/60">
                  <img
                    src={`/assets/inventory_portraits/${getPortraitFileName(currentAvatarId)}`}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      if (t.src.endsWith(".jpeg")) {
                        t.src = `/assets/inventory_portraits/${currentAvatarId}.jpg`;
                      } else {
                        t.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                      }
                    }}
                  />
                </div>

                {/* Small edit button at the bottom right */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsAvatarPickerOpen(true);
                  }}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black shadow-lg border-2 border-[#0c1017] transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title="Change Profile Picture"
                  aria-label="Change Profile Picture"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>

              {/* Username Info (Verified removed) */}
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {currentUsername}
                </h3>
                <p className="text-xs font-mono text-gray-400 truncate">
                  UID: {userId ? `${userId.slice(0, 8)}...${userId.slice(-6)}` : "Cloud Account"}
                </p>
                {createdAt && (
                  <p className="text-[11px] font-mono text-gray-500 truncate">
                    Member since {new Date(createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            {/* Account Info Rows */}
            <div className="space-y-4 pt-1">
              {/* 1. USERNAME ROW */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 transition-all">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Username:
                    </span>
                    <p className="text-sm font-bold font-mono text-white tracking-wide">
                      {currentUsername}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      const cooldown = getUsernameCooldownRemainingMs(userId);
                      if (cooldown > 0) {
                        const mins = Math.ceil(cooldown / (60 * 1000));
                        triggerSlowDownModal(`Username change cooldown: ${mins}m remaining!`);
                        return;
                      }
                      setIsEditingUsername((prev) => !prev);
                      setUsernameError(null);
                      setNewUsernameInput(currentUsername);
                    }}
                    className={`p-2 rounded-lg border transition-all ${
                      isEditingUsername
                        ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)]"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10 hover:border-yellow-400/40"
                    }`}
                    title="Edit Username"
                    aria-label="Edit Username"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Previous Usernames (Roblox replica) */}
                {previousUsernames.length > 0 && (
                  <div className="pt-1 border-t border-white/5">
                    <span className="text-xs text-gray-400 font-mono">
                      Previous usernames:{" "}
                      <strong className="text-gray-300 font-normal">
                        {previousUsernames.join(", ")}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Inline Edit Form */}
                <AnimatePresence>
                  {isEditingUsername && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSaveUsername}
                      className="pt-3 border-t border-white/10 space-y-3 overflow-hidden"
                    >
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-yellow-400 uppercase tracking-wider">
                          New Username
                        </label>
                        <input
                          type="text"
                          value={newUsernameInput}
                          onChange={(e) => setNewUsernameInput(e.target.value)}
                          placeholder="Enter new username"
                          maxLength={20}
                          className="w-full px-3.5 py-2 rounded-lg bg-black/60 border border-white/15 focus:border-yellow-400/60 text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                          autoFocus
                        />
                        <p className="text-[10px] font-mono text-gray-400">
                          3–20 alphanumeric characters, underscores (_), or hyphens (-).
                        </p>
                      </div>

                      {usernameError && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                          <span>{usernameError}</span>
                        </div>
                      )}

                      {usernameSuccess && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                          <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                          <span>Username updated successfully!</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          disabled={usernameLoading}
                          onClick={() => {
                            soundEngine.playClick();
                            setIsEditingUsername(false);
                            setUsernameError(null);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white border border-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={usernameLoading}
                          className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_15px_rgba(250,204,21,0.35)] transition-all disabled:opacity-50"
                        >
                          {usernameLoading ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <span>Save Changes</span>
                          )}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. PASSWORD ROW */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 transition-all">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Password:
                    </span>
                    <p className="text-sm font-mono text-gray-400 tracking-widest">
                      ••••••••••••
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      const cooldown = getPasswordCooldownRemainingMs(userId);
                      if (cooldown > 0) {
                        const mins = Math.ceil(cooldown / (60 * 1000));
                        triggerSlowDownModal(`Password change cooldown: ${mins}m remaining!`);
                        return;
                      }
                      setIsEditingPassword((prev) => !prev);
                      setPasswordError(null);
                      setCurrentPasswordInput("");
                      setNewPasswordInput("");
                      setConfirmPasswordInput("");
                    }}
                    className={`p-2 rounded-lg border transition-all ${
                      isEditingPassword
                        ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)]"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10 hover:border-yellow-400/40"
                    }`}
                    title="Change Password"
                    aria-label="Change Password"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Password Edit Form */}
                <AnimatePresence>
                  {isEditingPassword && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSavePassword}
                      className="pt-3 border-t border-white/10 space-y-3 overflow-hidden"
                    >
                      {/* Current Password */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                          Current Password (Optional verification)
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? "text" : "password"}
                            value={currentPasswordInput}
                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full pl-3.5 pr-10 py-2 rounded-lg bg-black/60 border border-white/15 focus:border-yellow-400/60 text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-yellow-400 uppercase tracking-wider">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full pl-3.5 pr-10 py-2 rounded-lg bg-black/60 border border-white/15 focus:border-yellow-400/60 text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-yellow-400 uppercase tracking-wider">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPass ? "text" : "password"}
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full pl-3.5 pr-10 py-2 rounded-lg bg-black/60 border border-white/15 focus:border-yellow-400/60 text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {passwordError && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                          <span>{passwordError}</span>
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                          <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                          <span>Password updated successfully!</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          disabled={passwordLoading}
                          onClick={() => {
                            soundEngine.playClick();
                            setIsEditingPassword(false);
                            setPasswordError(null);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white border border-white/10 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_15px_rgba(250,204,21,0.35)] transition-all disabled:opacity-50"
                        >
                          {passwordLoading ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <span>Update Password</span>
                          )}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Date of Birth Section (Account Recovery & 18+ Verification) */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                      <Cake className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white block">
                          Date of Birth
                        </span>
                        {birthdayVal && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              calculateAge(birthdayVal) >= 18
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            }`}
                          >
                            {calculateAge(birthdayVal) >= 18 ? "18+ Verified" : "Under 18"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[11px] font-mono text-gray-400">
                          {birthdayVal ? `${birthdayVal} (Age: ${calculateAge(birthdayVal)})` : "Not configured yet"}
                        </span>
                        {isBirthdayCooldownActive && (
                          <span className="text-[10px] font-mono text-amber-400/90 flex items-center space-x-1 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                            <Clock className="w-3 h-3" />
                            <span>Cooldown: {birthdayCooldownHours}h {birthdayCooldownMinutes}m</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      if (isBirthdayCooldownActive && !isEditingBirthday) {
                        setBirthdayError(`Cooldown active: You can change your birthday again in ${birthdayCooldownHours}h ${birthdayCooldownMinutes}m.`);
                      } else {
                        setBirthdayError(null);
                      }
                      setIsEditingBirthday((prev) => !prev);
                      setBirthdayInput(birthdayVal || "");
                    }}
                    className={`p-2 rounded-lg border transition-all cursor-pointer ${
                      isEditingBirthday
                        ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.3)]"
                        : isBirthdayCooldownActive
                        ? "bg-white/5 text-gray-500 border-white/5 hover:border-amber-400/30 hover:text-amber-400"
                        : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10 hover:border-yellow-400/40"
                    }`}
                    title={isBirthdayCooldownActive ? `Cooldown active (${birthdayCooldownHours}h ${birthdayCooldownMinutes}m)` : "Edit Date of Birth"}
                    aria-label="Edit Date of Birth"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Date of Birth Edit Form */}
                <AnimatePresence>
                  {isEditingBirthday && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSaveBirthday}
                      className="pt-3 border-t border-white/10 space-y-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-mono text-yellow-400 uppercase tracking-wider flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Select Date of Birth</span>
                          </label>
                          <span className="text-[10px] font-mono text-gray-500">1 day edit cooldown</span>
                        </div>
                        <input
                          type="date"
                          required
                          disabled={isBirthdayCooldownActive}
                          max={new Date().toISOString().split("T")[0]}
                          value={birthdayInput}
                          onChange={(e) => setBirthdayInput(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all [color-scheme:dark] disabled:opacity-50"
                        />
                        <p className="text-[10px] font-mono text-gray-400 leading-relaxed pt-0.5">
                          Used for account password recovery and 18+ age verification for Jinzhou Plaza casino games. Changing this triggers a 24-hour cooldown.
                        </p>
                      </div>

                      {birthdayError && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                          <span>{birthdayError}</span>
                        </div>
                      )}

                      {birthdaySuccess && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                          <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                          <span>Date of Birth updated successfully!</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          disabled={birthdayLoading}
                          onClick={() => {
                            soundEngine.playClick();
                            setIsEditingBirthday(false);
                            setBirthdayError(null);
                            setBirthdayInput(birthdayVal || "");
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={birthdayLoading || isBirthdayCooldownActive}
                          className="px-4 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_15px_rgba(250,204,21,0.35)] transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {birthdayLoading ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <span>Save Date of Birth</span>
                          )}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Picture Selection Sub-Modal */}
        <AnimatePresence>
          {isAvatarPickerOpen && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 select-none"
              onClick={() => setIsAvatarPickerOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative max-w-xl w-full bg-[#0d111a] border border-yellow-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-400">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-wider text-white">
                        Choose Profile Picture
                      </h3>
                      <p className="text-[11px] font-mono text-gray-400">
                        Select any resonator portrait available in inventory
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAvatarPickerOpen(false)}
                    className="relative p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={avatarSearch}
                    onChange={(e) => setAvatarSearch(e.target.value)}
                    placeholder="Search resonator..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/60 border border-white/15 focus:border-yellow-400/60 text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Grid of Available Portraits */}
                <div className="overflow-y-auto flex-1 p-1 max-h-[360px] scrollbar-thin scrollbar-thumb-white/10">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filteredPortraits.map((item) => {
                      const isSelected = tempSelectedAvatar === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            soundEngine.playClick();
                            setTempSelectedAvatar(item.id);
                          }}
                          className={`group flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-yellow-400/15 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.35)] scale-105"
                              : "bg-white/[0.02] border-white/10 hover:border-yellow-400/40 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-white/20 bg-black/50 shadow-md group-hover:scale-105 transition-transform">
                            <img
                              src={`/assets/inventory_portraits/${item.fileName}`}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                const t = e.currentTarget as HTMLImageElement;
                                if (t.src.endsWith(".jpeg")) {
                                  t.src = `/assets/inventory_portraits/${item.id}.jpg`;
                                }
                              }}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-yellow-400/25 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center shadow-md">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              </div>
                            )}
                          </div>
                          <span
                            className={`mt-1.5 text-[11px] font-mono text-center truncate max-w-full font-bold ${
                              isSelected ? "text-yellow-400" : "text-gray-300 group-hover:text-white"
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAvatarPickerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white border border-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={avatarSaving}
                    onClick={() => handleConfirmAvatar(tempSelectedAvatar)}
                    className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.35)] active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {avatarSaving ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Select Avatar</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
