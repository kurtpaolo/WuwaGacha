import { supabase, isSupabaseConfigured } from "./client";
import { User, Session } from "@supabase/supabase-js";
import { UserInventoryItem } from "./inventory";

export const PRESET_SECURITY_QUESTIONS = [
  "Most Favorite Resonator",
  "Least Favorite Resonator",
] as const;

export { ALL_RESONATORS_LIST, type ResonatorOption } from "@/lib/data/items";

/**
 * Computes a standard SHA-256 hash string for security answers.
 */
export async function sha256(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Converts a raw username into an internal Supabase auth email format.
 * Strips whitespace and ensures safe lowercase alphanumeric characters.
 */
export function formatUsernameEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!clean) throw new Error("Username must contain at least one valid character (letters, numbers, _, -)");
  return `${clean}@app.internal`;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error?: string | null;
}

/**
 * Register a new account with Username, Password, and Security Question/Answer.
 */
export async function signUpWithUsername(
  username: string,
  password: string,
  securityQuestion?: string,
  securityAnswer?: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      session: null,
      error: "Supabase is not configured yet. Please add your credentials to .env.local",
    };
  }

  const trimmedUser = username.trim();
  if (trimmedUser.length < 3) {
    return { user: null, session: null, error: "Username must be at least 3 characters long." };
  }
  if (password.length < 6) {
    return { user: null, session: null, error: "Password must be at least 6 characters long." };
  }

  try {
    const email = formatUsernameEmail(trimmedUser);
    let answerHash: string | undefined;
    if (securityAnswer && securityAnswer.trim()) {
      answerHash = await sha256(securityAnswer.trim());
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: trimmedUser,
          security_question: securityQuestion?.trim() || undefined,
          security_answer_hash: answerHash,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("user already exists")) {
        return { user: null, session: null, error: "This username is already taken. Please choose another." };
      }
      return { user: null, session: null, error: error.message };
    }

    // Also ensure profiles table has security_question and security_answer_hash
    if (data.user && (securityQuestion || answerHash)) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          username: trimmedUser,
          security_question: securityQuestion?.trim() || null,
          security_answer_hash: answerHash || null,
        });
      } catch {}
    }

    // If signup succeeded but session wasn't created immediately, attempt signin
    if (data.user && !data.session) {
      const loginAttempt = await signInWithUsername(trimmedUser, password);
      if (loginAttempt.user) {
        return loginAttempt;
      }
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err: any) {
    return { user: null, session: null, error: err.message || "Sign up failed" };
  }
}

/**
 * Sign in with Username and Password.
 */
export async function signInWithUsername(
  username: string,
  password: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      session: null,
      error: "Supabase is not configured yet. Please add your credentials to .env.local",
    };
  }

  const trimmedUser = username.trim();
  if (!trimmedUser || !password) {
    return { user: null, session: null, error: "Please enter both username and password." };
  }

  try {
    const email = formatUsernameEmail(trimmedUser);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        return { user: null, session: null, error: "Invalid username or password." };
      }
      return { user: null, session: null, error: error.message };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err: any) {
    return { user: null, session: null, error: err.message || "Sign in failed" };
  }
}

/**
 * Sign out current session.
 */
export async function signOut(): Promise<{ error?: string | null }> {
  if (!isSupabaseConfigured()) return {};
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

/**
 * Get current session.
 */
export async function getAuthSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Get current logged in user.
 */
export async function getAuthUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Retrieves stored previous usernames for a user ID.
 */
export function getPreviousUsernames(userId: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`wuwa_prev_usernames_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Updates a user's username across Supabase Auth and Profiles table.
 */
export async function updateUserUsername(
  userId: string,
  currentUsername: string,
  newUsername: string
): Promise<{
  success: boolean;
  error?: string | null;
  updatedUsername?: string;
  previousUsernames?: string[];
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured." };
  }

  const trimmed = newUsername.trim();
  if (trimmed.length < 3) {
    return { success: false, error: "Username must be at least 3 characters long." };
  }
  if (trimmed.length > 20) {
    return { success: false, error: "Username must not exceed 20 characters." };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      success: false,
      error: "Username may only contain letters, numbers, hyphens, and underscores.",
    };
  }

  if (trimmed.toLowerCase() === currentUsername.trim().toLowerCase()) {
    return {
      success: true,
      updatedUsername: trimmed,
      previousUsernames: getPreviousUsernames(userId),
    };
  }

  try {
    // 1. Check uniqueness in profiles table
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", trimmed)
      .neq("id", userId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "This username is already taken. Please choose another." };
    }

    // 2. Update profiles table
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        username: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileErr) {
      return { success: false, error: profileErr.message };
    }

    // 3. Update Supabase Auth email and metadata
    const newEmail = formatUsernameEmail(trimmed);
    try {
      await supabase.auth.updateUser({
        email: newEmail,
        data: { username: trimmed },
      });
    } catch {
      await supabase.auth.updateUser({
        data: { username: trimmed },
      });
    }

    // 4. Save to previous usernames list in localStorage and user_metadata
    let prevList = getPreviousUsernames(userId);
    if (currentUsername && currentUsername !== "Player" && !prevList.includes(currentUsername)) {
      prevList = [currentUsername, ...prevList].slice(0, 5);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`wuwa_prev_usernames_${userId}`, JSON.stringify(prevList));
        } catch {}
      }
      try {
        await supabase.auth.updateUser({
          data: { username: trimmed, previous_usernames: prevList },
        });
      } catch {}
    }

    return {
      success: true,
      updatedUsername: trimmed,
      previousUsernames: prevList,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update username." };
  }
}

/**
 * Updates a user's password in Supabase Auth, optionally validating current password.
 */
export async function updateUserPassword(
  newPassword: string,
  currentPassword?: string
): Promise<{ success: boolean; error?: string | null }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  try {
    // If current password provided, verify it first
    if (currentPassword) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) {
        return { success: false, error: "No active user session found." };
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyErr) {
        return { success: false, error: "Current password is incorrect." };
      }
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update password." };
  }
}

/**
 * Retrieves the current security question for a user by user ID.
 */
export async function getUserSecurityQuestionById(
  userId: string
): Promise<{ question: string | null; error?: string | null }> {
  if (!isSupabaseConfigured() || !userId) {
    return { question: null };
  }
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("security_question")
      .eq("id", userId)
      .maybeSingle();

    if (error) return { question: null, error: error.message };
    return { question: data?.security_question || null };
  } catch (err: any) {
    return { question: null, error: err.message };
  }
}

/**
 * Updates a user's security question and answer hash in Supabase Auth & Profiles.
 */
export async function updateUserSecurityQuestion(
  userId: string,
  question: string,
  answer: string
): Promise<{ success: boolean; error?: string | null }> {
  if (!isSupabaseConfigured() || !userId) {
    return { success: false, error: "Database not configured." };
  }

  const cleanAnswer = answer.trim();
  if (!cleanAnswer) {
    return { success: false, error: "Security answer cannot be empty." };
  }

  try {
    const answerHash = await sha256(cleanAnswer);

    // 1. Update Auth metadata
    try {
      await supabase.auth.updateUser({
        data: {
          security_question: question.trim(),
          security_answer_hash: answerHash,
        },
      });
    } catch {}

    // 2. Try RPC first (security definer bypasses RLS)
    try {
      const { data, error } = await supabase.rpc("save_user_security_question", {
        p_user_id: userId,
        p_question: question.trim(),
        p_answer_hash: answerHash,
      });
      if (!error && data && data.success) {
        return { success: true };
      }
    } catch {}

    // 3. Fallback to direct table update
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        security_question: question.trim(),
        security_answer_hash: answerHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileErr) {
      return { success: false, error: profileErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update security question." };
  }
}

/**
 * Retrieves the stored avatar ID for a given user.
 */
export function getStoredAvatarId(userId?: string): string {
  if (typeof window === "undefined" || !userId) return "shorekeeper";
  try {
    const local = localStorage.getItem(`wuwa_avatar_${userId}`);
    if (local) return local;
  } catch {}
  return "shorekeeper";
}

/**
 * Saves and syncs the selected avatar ID strictly for this user ID.
 */
export async function updateUserAvatar(userId: string, avatarId: string): Promise<void> {
  if (!userId) return;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wuwa_avatar_${userId}`, avatarId);
      // Remove any lingering shared key to prevent cross-account bleeding
      localStorage.removeItem("wuwa_active_avatar");
    } catch {}
  }

  if (isSupabaseConfigured() && userId) {
    try {
      await supabase.auth.updateUser({
        data: { avatar_id: avatarId },
      });
    } catch (e) {
      console.warn("Could not save avatar to Supabase metadata:", e);
    }

    // 1. Try dedicated RPC (security definer, bypasses RLS)
    try {
      const { error: rpcErr } = await supabase.rpc("save_player_avatar", {
        p_user_id: userId,
        p_avatar_id: avatarId,
      });
      if (!rpcErr) return;
    } catch {}

    // 2. Direct table update fallback
    try {
      await supabase
        .from("profiles")
        .update({ avatar_id: avatarId })
        .eq("id", userId);
    } catch (e) {
      console.warn("Could not save avatar_id to profiles:", e);
    }
  }
}

/**
 * Retrieves the security question for a given username.
 */
export async function getUserSecurityQuestion(username: string): Promise<{
  question?: string;
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { error: "Database not configured." };
  }

  const trimmed = username.trim().toLowerCase();
  if (!trimmed) {
    return { error: "Please enter a username." };
  }

  try {
    // 1. Try RPC first if available
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_user_security_question", {
      p_username: trimmed,
    });
    if (!rpcError && rpcData) {
      return { question: rpcData };
    }

    // 2. Query profiles directly
    const { data, error } = await supabase
      .from("profiles")
      .select("security_question")
      .ilike("username", trimmed)
      .maybeSingle();

    if (error) {
      return { error: "Could not find account. Please check your username." };
    }

    if (!data) {
      return { error: "No account found with this username." };
    }

    if (!data.security_question) {
      return { error: "No security question was configured for this account." };
    }

    return { question: data.security_question };
  } catch (err: any) {
    return { error: err.message || "Failed to retrieve security question." };
  }
}

/**
 * Resets user password by verifying their security answer through Supabase RPC.
 */
export async function resetPasswordWithSecurityAnswer(
  username: string,
  answer: string,
  newPassword: string
): Promise<{ success: boolean; error?: string | null }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Database not configured." };
  }

  const trimmed = username.trim().toLowerCase();
  const trimmedAnswer = answer.trim();

  if (!trimmed) {
    return { success: false, error: "Please enter a username." };
  }
  if (!trimmedAnswer) {
    return { success: false, error: "Please enter the answer to your security question." };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long." };
  }

  try {
    const { data, error } = await supabase.rpc("reset_password_with_security_answer", {
      p_username: trimmed,
      p_answer: trimmedAnswer,
      p_new_password: newPassword,
    });

    if (error) {
      if (error.message.includes("function") && error.message.includes("does not exist")) {
        return {
          success: false,
          error: "Database reset function not found. Please run the SQL in supabase_schema.sql inside your Supabase SQL editor.",
        };
      }
      return { success: false, error: error.message };
    }

    if (data && typeof data === "object") {
      if (!data.success) {
        return { success: false, error: data.error || "Incorrect answer to security question." };
      }
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset password." };
  }
}

export interface PlayerPublicProfile {
  id: string;
  username: string;
  astrite: number;
  pity_5star: number;
  avatar_id: string;
  custom_title?: string;
  showcase_ids: string[];
  created_at?: string;
  inventory: UserInventoryItem[];
  total_pulls?: number;
  wins_5050?: number;
  total_5050?: number;
  is_vip?: boolean;
  login_streak?: number;
  max_login_streak?: number;
}

export interface PlayerSearchResult {
  id: string;
  username: string;
  avatar_id: string;
  custom_title?: string;
  astrite?: number;
  pity_5star?: number;
  is_vip?: boolean;
}

/**
 * Searches for a list of players matching a query string (with leading @ stripped).
 */
export async function searchPlayersList(
  query: string
): Promise<{ players: PlayerSearchResult[]; error?: string | null }> {
  if (!isSupabaseConfigured()) {
    return { players: [], error: "Database not configured." };
  }

  const clean = query.trim().replace(/^@+/, "").toLowerCase();
  if (!clean) {
    return { players: [] };
  }

  try {
    // 1. First attempt: call search_players RPC function (bypasses RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("search_players", {
        p_query: clean,
      });

      if (!rpcError && Array.isArray(rpcData)) {
        const players: PlayerSearchResult[] = rpcData.map((p: any) => ({
          id: p.id,
          username: p.username,
          avatar_id: p.avatar_id || "shorekeeper",
          custom_title: p.custom_title || undefined,
          astrite: p.astrite ?? 0,
          pity_5star: p.pity_5star ?? 0,
          is_vip: Boolean(p.is_vip),
        }));
        return { players };
      }
    } catch {
      // RPC not installed yet, proceed to table fallback
    }

    // 2. Fallback: Direct table query on profiles
    let rawList: any[] | null = null;

    const { data: fullData, error: fullError } = await supabase
      .from("profiles")
      .select("id, username, avatar_id, custom_title, selected_char_id, astrite, pity_5star")
      .ilike("username", `%${clean}%`)
      .limit(15);

    if (fullError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, username, avatar_id, custom_title, astrite, pity_5star")
        .ilike("username", `%${clean}%`)
        .limit(15);

      if (fallbackError) {
        return { players: [], error: fallbackError.message };
      }
      rawList = fallbackData;
    } else {
      rawList = fullData;
    }

    const players: PlayerSearchResult[] = (rawList || []).map((p: any) => ({
      id: p.id,
      username: p.username,
      avatar_id: p.avatar_id || "shorekeeper",
      custom_title: p.custom_title || undefined,
      astrite: p.astrite ?? 0,
      pity_5star: p.pity_5star ?? 0,
    }));

    return { players };
  } catch (err: any) {
    return { players: [], error: err.message || "Failed to search players." };
  }
}

/**
 * Searches for any player by username to view their Anime Vanguards-style profile.
 */
export async function searchPlayerProfile(
  targetUsername: string
): Promise<{ profile?: PlayerPublicProfile | null; error?: string | null }> {
  if (!isSupabaseConfigured()) {
    return { error: "Database not configured." };
  }

  const trimmed = targetUsername.trim().replace(/^@+/, "").toLowerCase();
  if (!trimmed) {
    return { error: "Please enter a player username." };
  }

  try {
    // 1. First attempt: call get_player_profile RPC function (bypasses RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_player_profile", {
        p_username: trimmed,
      });

      if (!rpcError && rpcData && typeof rpcData === "object" && rpcData.id) {
        const inv: UserInventoryItem[] = Array.isArray(rpcData.inventory) ? rpcData.inventory : [];
        const ownedSet = new Set(inv.map((i) => i.character_id.toLowerCase()));
        let showcaseIds: string[] = [];
        if (Array.isArray(rpcData.showcase_ids)) {
          showcaseIds = rpcData.showcase_ids.filter(
            (id: string) => id && ownedSet.has(id.toLowerCase())
          );
        }

        return {
          profile: {
            id: rpcData.id,
            username: rpcData.username,
            astrite: rpcData.astrite ?? 0,
            pity_5star: rpcData.pity_5star ?? 0,
            avatar_id: rpcData.avatar_id || "shorekeeper",
            custom_title: rpcData.custom_title || undefined,
            showcase_ids: showcaseIds,
            created_at: rpcData.created_at,
            inventory: inv,
            total_pulls: rpcData.total_pulls ?? 0,
            wins_5050: rpcData.wins_5050 ?? 0,
            total_5050: rpcData.total_5050 ?? 0,
            is_vip: Boolean(rpcData.is_vip),
            login_streak: rpcData.login_streak ?? 1,
            max_login_streak: rpcData.max_login_streak ?? rpcData.login_streak ?? 1,
          },
        };
      }
    } catch {
      // RPC not installed yet, proceed to table fallback
    }

    // 2. Fallback: Direct table queries
    let profileData: any = null;

    // Query available columns without hard-failing on missing schema columns
    const { data: fullData, error: fullError } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", trimmed)
      .maybeSingle();

    if (fullError) {
      // Fallback to minimal guaranteed columns if * encounters any column errors
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, username, astrite, pity_5star, avatar_id, custom_title, total_pulls, wins_5050, total_5050, created_at")
        .ilike("username", trimmed)
        .maybeSingle();

      if (fallbackError) {
        return { error: fallbackError.message };
      }
      profileData = fallbackData;
    } else {
      profileData = fullData;
    }

    if (!profileData) {
      return { error: `Player "@${targetUsername}" was not found.` };
    }

    const { data: invData } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", profileData.id)
      .order("count", { ascending: false });

    const inventory: UserInventoryItem[] = invData || [];

    // Only use showcase IDs explicitly saved by the player that exist in their inventory.
    const ownedSet = new Set(inventory.map((i) => i.character_id.toLowerCase()));
    let showcaseIds: string[] = [];
    if (profileData && Array.isArray(profileData.showcase_ids)) {
      showcaseIds = profileData.showcase_ids.filter(
        (id: string) => id && ownedSet.has(id.toLowerCase())
      );
    }

    return {
      profile: {
        id: profileData.id,
        username: profileData.username,
        astrite: profileData.astrite ?? 0,
        pity_5star: profileData.pity_5star ?? 0,
        avatar_id: profileData.avatar_id || "shorekeeper",
        custom_title: profileData.custom_title || undefined,
        showcase_ids: showcaseIds,
        created_at: profileData.created_at,
        inventory,
        total_pulls: profileData.total_pulls ?? 0,
        wins_5050: profileData.wins_5050 ?? 0,
        total_5050: profileData.total_5050 ?? 0,
        is_vip: Boolean(profileData.is_vip),
        login_streak: profileData.login_streak ?? 1,
        max_login_streak: profileData.max_login_streak ?? profileData.login_streak ?? 1,
      },
    };
  } catch (err: any) {
    return { error: err.message || "Failed to load player profile." };
  }
}

/**
 * Updates a player's 6 showcase resonator IDs in localStorage and Supabase profiles.
 */
export async function updateShowcaseResonatorIds(
  userId: string,
  showcaseIds: string[]
): Promise<void> {
  if (typeof window !== "undefined" && userId) {
    try {
      localStorage.setItem(`wuwa_showcase_${userId}`, JSON.stringify(showcaseIds));
    } catch {}
  }

  if (isSupabaseConfigured() && userId) {
    try {
      // 1. Try dedicated RPC function (SECURITY DEFINER, bypasses RLS)
      try {
        const { error: rpcErr } = await supabase.rpc("save_player_showcase", {
          p_user_id: userId,
          p_showcase_ids: showcaseIds,
        });
        if (!rpcErr) return;
      } catch {}

      // 2. Fallback to direct table update
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ showcase_ids: showcaseIds })
        .eq("id", userId);

      if (updateErr) {
        console.warn("Could not save showcase IDs to database:", updateErr.message);
      }
    } catch (err) {
      console.warn("Exception saving showcase IDs to database:", err);
    }
  }
}

/**
 * Retrieves stored showcase resonator IDs for a user.
 */
export function getStoredShowcaseResonatorIds(userId?: string): string[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`wuwa_showcase_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

