"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  signInWithUsername,
  signUpWithUsername,
  getUserSecurityQuestion,
  resetPasswordWithSecurityAnswer,
  PRESET_SECURITY_QUESTIONS,
  ALL_RESONATORS_LIST,
} from "@/lib/supabase/auth";
import { fetchUserProfile, UserProfile } from "@/lib/supabase/profile";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  ShieldCheck,
  User,
  Lock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Database,
  HelpCircle,
  KeyRound,
  Check,
  ArrowLeft,
  Infinity,
  ChevronDown,
  X,
  Layers,
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { PrivacyModal } from "@/components/modals/PrivacyModal";
import { HowToPlayModal } from "@/components/modals/HowToPlayModal";
import { ScrollableSelect } from "@/components/ui/ScrollableSelect";
import { SlowDownModal } from "@/components/modals/SlowDownModal";
import { ExternalRedirectModal } from "@/components/modals/ExternalRedirectModal";

interface LoginGatewayProps {
  onLoginSuccess: (user: SupabaseUser, profile: UserProfile | null, isNewAccount?: boolean) => void;
  onEnterSandbox?: () => void;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({
  onLoginSuccess,
  onEnterSandbox,
}) => {
  const [hasAcceptedBeta, setHasAcceptedBeta] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("wuwa_beta_acknowledged") === "true";
    }
    return false;
  });
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  // Sign up security question state
  const [securityQuestion, setSecurityQuestion] = useState<string>(PRESET_SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState<string>("");

  // Forgot password flow state
  const [forgotUsername, setForgotUsername] = useState<string>("");
  const [recoveredQuestion, setRecoveredQuestion] = useState<string | null>(null);
  const [forgotAnswer, setForgotAnswer] = useState<string>("");
  const [isManualForgotAnswer, setIsManualForgotAnswer] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showSandboxWarning, setShowSandboxWarning] = useState<boolean>(false);

  const resonatorSelectOptions = useMemo(
    () =>
      ALL_RESONATORS_LIST.map((r) => ({
        value: r.name,
        label: r.name,
        rarity: r.rarity,
      })),
    []
  );

  const supabaseReady = isSupabaseConfigured();

  // Reset errors when switching modes
  const handleSwitchMode = (newMode: "signin" | "signup" | "forgot") => {
    soundEngine.playClick();
    setMode(newMode);
    setErrorMsg(null);
    setResetSuccess(false);
    if (newMode === "forgot") {
      setForgotUsername(username || "");
      setRecoveredQuestion(null);
      setForgotAnswer("");
      setIsManualForgotAnswer(false);
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  // Sign in / Sign up submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg("Please enter a username.");
      return;
    }
    if (cleanUser.length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && (!securityAnswer || !securityAnswer.trim())) {
      setErrorMsg("Please select a resonator for your security question.");
      return;
    }

    setLoading(true);
    soundEngine.playClick();

    try {
      if (mode === "signin") {
        const res = await signInWithUsername(cleanUser, password);
        if (res.error) {
          setErrorMsg(res.error);
          setLoading(false);
          return;
        }

        if (res.user) {
          const profile = await fetchUserProfile(res.user.id, cleanUser);
          onLoginSuccess(res.user, profile, false);
        }
      } else {
        const res = await signUpWithUsername(
          cleanUser,
          password,
          securityQuestion,
          securityAnswer.trim()
        );
        if (res.error) {
          setErrorMsg(res.error);
          setLoading(false);
          return;
        }

        if (res.user) {
          if (typeof window !== "undefined") {
            localStorage.setItem(`wuwa_newbie_guide_pending_${res.user.id}`, "true");
          }
          const profile = await fetchUserProfile(res.user.id, cleanUser);
          onLoginSuccess(res.user, profile, true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Find security question for username
  const handleFindQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = forgotUsername.trim();
    if (!clean) {
      setErrorMsg("Please enter your username.");
      return;
    }

    setLoading(true);
    soundEngine.playClick();

    try {
      const res = await getUserSecurityQuestion(clean);
      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }
      if (res.question) {
        setRecoveredQuestion(res.question);
      } else {
        setErrorMsg("No security question was found for this username.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to find user account.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit security answer and new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!forgotAnswer.trim()) {
      setErrorMsg("Please answer your security question.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    soundEngine.playClick();

    try {
      const res = await resetPasswordWithSecurityAnswer(
        forgotUsername.trim(),
        forgotAnswer.trim(),
        newPassword
      );

      if (!res.success) {
        setErrorMsg(res.error || "Incorrect answer to security question.");
        setLoading(false);
        return;
      }

      setResetSuccess(true);
      setTimeout(() => {
        setUsername(forgotUsername.trim());
        setPassword("");
        setMode("signin");
        setResetSuccess(false);
        setRecoveredQuestion(null);
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e] text-white select-none overflow-hidden p-4">
      {/* Background Ambience & Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#201d12_0%,#07090e_75%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-70" />
      </div>

      <AnimatePresence mode="wait">
        {!hasAcceptedBeta ? (
          <motion.div
            key="beta-screen"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md bg-[#0e121b]/95 border border-yellow-400/40 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden p-6 sm:p-8 text-center space-y-6"
          >
            {/* Top Branded Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.6)]" />

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.25)]">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-mono font-bold tracking-widest text-yellow-400 uppercase">
                Notice
              </h2>
              <p className="text-base sm:text-lg font-black text-white leading-snug font-display">
                This web app is still in beta, bugs and delays are to be expected
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                soundEngine.startBGM();
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("wuwa_beta_acknowledged", "true");
                }
                setHasAcceptedBeta(true);
              }}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black uppercase tracking-wider text-xs sm:text-sm shadow-[0_0_25px_rgba(250,204,21,0.5)] active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </motion.div>
        ) : (
          /* Main Login Card */
          <motion.div
            key="login-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-md bg-[#0e121b]/95 border border-white/15 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden"
          >
            {/* Top Branded Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.6)]" />

        <div className="p-6 sm:p-8 space-y-5">
          {/* Header & Logo */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.2)] mb-1">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white drop-shadow-md">
              YOU&apos;RE ONE GACHA ADDICT
            </h1>
            <p className="text-xs font-mono text-gray-400">
              {mode === "forgot"
                ? "Account Recovery via Security Question"
                : "Unofficial Fan-Made Convene Simulator • Non-Commercial"}
            </p>

            {/* How to Play Guide & Sandbox Mode Triggers */}
            <div className="pt-1.5 flex items-center justify-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setShowHowToPlay(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-yellow-400/15 border border-white/10 hover:border-yellow-400/40 text-gray-300 hover:text-yellow-300 text-[11px] font-mono transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
                <span>HOW TO PLAY</span>
              </button>

              {onEnterSandbox && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowSandboxWarning(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-emerald-400/15 border border-white/10 hover:border-emerald-400/40 text-gray-300 hover:text-emerald-300 text-[11px] font-mono transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Test summons freely in Sandbox Mode"
                >
                  <Infinity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SANDBOX MODE</span>
                </button>
              )}
            </div>
          </div>

          {/* Configuration Warning (if Supabase credentials aren't in .env.local yet) */}
          {!supabaseReady && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-left">
              <Database className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <strong className="text-amber-300 block font-bold mb-0.5">Database Setup Required</strong>
                Add your Supabase credentials to <code className="bg-black/50 px-1 py-0.5 rounded text-amber-300">.env.local</code> to enable live logins and inventory.
              </div>
            </div>
          )}

          {/* Mode Switch Tabs (Sign In / Register / Forgot Password) */}
          {mode !== "forgot" ? (
            <div className="grid grid-cols-2 p-1 bg-black/60 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => handleSwitchMode("signin")}
                className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  mode === "signin"
                    ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("signup")}
                className={`py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  mode === "signup"
                    ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => handleSwitchMode("signin")}
                className="text-xs font-mono text-gray-400 hover:text-yellow-400 flex items-center space-x-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400">
                Password Reset
              </span>
            </div>
          )}

          {/* Normal Sign In & Sign Up Form */}
          {mode !== "forgot" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                  Username
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-500 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={mode === "signup" ? "e.g. rover_main (don't use real name)" : "Enter your username"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all shadow-inner"
                  />
                </div>
                {mode === "signup" && (
                  <p className="text-[10px] font-mono text-gray-500 pl-1">
                    💡 For your privacy, please use a gamer handle instead of your real name.
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleSwitchMode("forgot")}
                      className="text-[11px] font-mono text-yellow-400/80 hover:text-yellow-400 transition-colors focus:outline-none"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-500 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Sign Up: Security Question & Answer */}
              {mode === "signup" && (
                <div className="space-y-3 pt-1 border-t border-white/10 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Security Question (For Password Recovery)</span>
                    </label>
                    <ScrollableSelect
                      value={securityQuestion}
                      onChange={(val) => setSecurityQuestion(val)}
                      options={PRESET_SECURITY_QUESTIONS}
                      placeholder="Select a question"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                      Choose Resonator
                    </label>
                    <ScrollableSelect
                      value={securityAnswer}
                      onChange={(val) => setSecurityAnswer(val)}
                      options={resonatorSelectOptions}
                      placeholder="-- Select a Resonator --"
                    />
                    <p className="text-[10px] font-mono text-gray-400">
                      Answer this question if you ever forget your password to recover your account.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message Alert */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2.5 text-xs text-red-300 text-left"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-black font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_25px_rgba(250,204,21,0.45)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{loading ? "Authenticating..." : mode === "signin" ? "Enter Convene" : "Register & Start"}</span>
                {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>

              {/* Disclaimer & Privacy Policy Link Buttons at Bottom */}
              <div className="pt-2 flex items-center justify-center space-x-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowDisclaimer(true);
                  }}
                  className="text-[11px] font-mono text-gray-400 hover:text-yellow-400 transition-colors underline underline-offset-4 tracking-wider uppercase inline-flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-yellow-400/70" />
                  <span>Copyright & Fair Use</span>
                </button>
                <span className="text-gray-600 font-mono text-xs">•</span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowPrivacy(true);
                  }}
                  className="text-[11px] font-mono text-gray-400 hover:text-emerald-400 transition-colors underline underline-offset-4 tracking-wider uppercase inline-flex items-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400/70" />
                  <span>Privacy Policy</span>
                </button>
              </div>
            </form>
          ) : (
            /* Forgot Password Flow */
            <div className="space-y-4 text-left">
              {!recoveredQuestion ? (
                /* Step 1: Enter Username */
                <form onSubmit={handleFindQuestion} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                      Enter Your Username
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-gray-500 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="e.g. rover_main"
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2.5 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{loading ? "Searching..." : "Find Account & Question"}</span>
                    {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                </form>
              ) : (
                /* Step 2: Answer Question & Set New Password */
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  {/* Retrieved Question Box */}
                  <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold block">
                      Security Question for @{forgotUsername}:
                    </span>
                    <p className="text-xs font-bold text-white font-mono">
                      {recoveredQuestion}
                    </p>
                  </div>

                  {/* Security Answer Input / Dropdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                        Your Resonator Answer
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setIsManualForgotAnswer((prev) => !prev);
                        }}
                        className="text-[10px] font-mono text-yellow-400/80 hover:text-yellow-400 transition-colors cursor-pointer"
                      >
                        {isManualForgotAnswer ? "Pick from dropdown" : "Can't find? Type manually"}
                      </button>
                    </div>
                    {isManualForgotAnswer ? (
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Enter resonator name"
                        value={forgotAnswer}
                        onChange={(e) => setForgotAnswer(e.target.value)}
                        className="w-full px-3.5 py-2 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all"
                      />
                    ) : (
                      <ScrollableSelect
                        value={forgotAnswer}
                        onChange={(val) => setForgotAnswer(val)}
                        options={resonatorSelectOptions}
                        placeholder="-- Select your Resonator --"
                      />
                    )}
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold block">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-2.5 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {resetSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2.5 text-xs text-emerald-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Password reset successfully! Returning to Sign In...</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setRecoveredQuestion(null)}
                      className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 border border-white/10 transition-colors"
                    >
                      Change User
                    </button>
                    <button
                      type="submit"
                      disabled={loading || resetSuccess}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.35)] active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{loading ? "Resetting..." : "Reset Password"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Complete Copyright Notice Modal */}
      <DetailsModal
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
      />

      {/* How to Play Guide Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      {/* Sandbox Mode Warning / Confirmation Modal */}
      <AnimatePresence>
        {showSandboxWarning && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none"
            onClick={() => setShowSandboxWarning(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#0d131a] border-2 border-emerald-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Infinity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-white">
                      Entering Sandbox Mode
                    </h2>
                    <p className="text-[11px] font-mono text-emerald-400">
                      Free Testing &amp; Summon Simulation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSandboxWarning(false)}
                  className="relative p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>

              {/* Explanation Points */}
              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/20 flex items-start space-x-3">
                  <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">Unlimited Astrites &amp; Pulls</span>
                    <span className="text-gray-400 leading-relaxed text-[11px]">
                      Convene as much as you want with unlimited currency. Test any pull strategy or banner rate freely.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/20 flex items-start space-x-3">
                  <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">All Banners Unlocked</span>
                    <span className="text-gray-400 leading-relaxed text-[11px]">
                      Switch between past, present, and standard event banners at any time.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-300 block">No Cloud Saving</span>
                    <span className="text-amber-200/80 leading-relaxed text-[11px]">
                      Sandbox data is temporary to your browser session. Pulls and items obtained will not save to your cloud account.
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowSandboxWarning(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setShowSandboxWarning(false);
                    if (onEnterSandbox) onEnterSandbox();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Enter Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      <SlowDownModal />
      <ExternalRedirectModal />
    </div>
  );
};
