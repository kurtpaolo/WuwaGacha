/**
 * Daily Login Streak Engine (00:00 GMT+8 Reset)
 * Evaluates consecutive logins based on GMT+8 (Asia/Shanghai / UTC+8) calendar days.
 * Resets active streak if a day is missed, but permanently preserves maxLoginStreak
 * for lifelong milestone titles and Free Astrites storage expansions.
 */

export interface LoginStreakData {
  streak: number;
  maxStreak: number;
  lastLoginDate: string; // "YYYY-MM-DD"
  isNewDay: boolean;
}

/**
 * Returns current date string "YYYY-MM-DD" strictly in GMT+8 (UTC+8).
 */
export function getGMT8DateString(date: Date = new Date()): string {
  // Add 8 hours to UTC time
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const gmt8Date = new Date(utcMs + 8 * 3600000);
  const year = gmt8Date.getFullYear();
  const month = String(gmt8Date.getMonth() + 1).padStart(2, "0");
  const day = String(gmt8Date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates calendar day difference between two "YYYY-MM-DD" strings in UTC.
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  try {
    const d1 = new Date(`${dateStr1}T00:00:00Z`);
    const d2 = new Date(`${dateStr2}T00:00:00Z`);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function getStreakStorageKey(userId?: string | null): string {
  if (userId) return `wuwa_login_streak_${userId}`;
  return "wuwa_login_streak_guest";
}

/**
 * Retrieves cached login streak data from localStorage.
 */
export function getStoredLoginStreak(userId?: string | null): LoginStreakData {
  const fallback: LoginStreakData = {
    streak: 1,
    maxStreak: 1,
    lastLoginDate: getGMT8DateString(),
    isNewDay: false,
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(getStreakStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.streak === "number") {
        return {
          streak: Math.max(1, parsed.streak),
          maxStreak: Math.max(1, parsed.maxStreak || parsed.streak),
          lastLoginDate: parsed.lastLoginDate || getGMT8DateString(),
          isNewDay: false,
        };
      }
    }
  } catch {}

  return fallback;
}

/**
 * Saves login streak data to localStorage.
 */
export function saveStoredLoginStreak(userId: string | null | undefined, data: LoginStreakData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      getStreakStorageKey(userId),
      JSON.stringify({
        streak: data.streak,
        maxStreak: data.maxStreak,
        lastLoginDate: data.lastLoginDate,
      })
    );
  } catch {}
}

/**
 * Evaluates and records a login attempt against 00:00 GMT+8.
 * - Same day: returns current streak unchanged (isNewDay: false).
 * - Next day (consecutive): streak increments by 1 (isNewDay: true).
 * - Missed 1+ days: streak resets to 1, maxStreak preserved (isNewDay: true).
 * - First time: streak = 1, maxStreak = 1 (isNewDay: true).
 */
export function processLoginStreak(
  userId?: string | null,
  cloudStreak?: number,
  cloudMaxStreak?: number,
  cloudLastDate?: string | null
): LoginStreakData {
  const todayStr = getGMT8DateString();
  const cached = getStoredLoginStreak(userId);

  // Reconcile cloud vs local cached data
  const currentStreak = Math.max(1, cloudStreak ?? cached.streak ?? 1);
  const currentMaxStreak = Math.max(
    currentStreak,
    cloudMaxStreak ?? cached.maxStreak ?? 1
  );
  const lastDate = cloudLastDate || cached.lastLoginDate;

  // First time ever recording login
  if (!lastDate) {
    const result: LoginStreakData = {
      streak: 1,
      maxStreak: Math.max(1, currentMaxStreak),
      lastLoginDate: todayStr,
      isNewDay: true,
    };
    saveStoredLoginStreak(userId, result);
    return result;
  }

  // Already logged in today in GMT+8
  if (lastDate === todayStr) {
    const result: LoginStreakData = {
      streak: currentStreak,
      maxStreak: Math.max(currentStreak, currentMaxStreak),
      lastLoginDate: todayStr,
      isNewDay: false,
    };
    saveStoredLoginStreak(userId, result);
    return result;
  }

  // Calculate day difference from last login
  const dayDiff = getDaysDifference(lastDate, todayStr);

  if (dayDiff === 1) {
    // Consecutive day! Increment streak
    const newStreak = currentStreak + 1;
    const newMaxStreak = Math.max(newStreak, currentMaxStreak);
    const result: LoginStreakData = {
      streak: newStreak,
      maxStreak: newMaxStreak,
      lastLoginDate: todayStr,
      isNewDay: true,
    };
    saveStoredLoginStreak(userId, result);
    return result;
  } else if (dayDiff > 1) {
    // Missed at least 1 calendar day in GMT+8. Reset active streak to 1, preserve maxStreak!
    const newStreak = 1;
    const newMaxStreak = Math.max(newStreak, currentMaxStreak);
    const result: LoginStreakData = {
      streak: newStreak,
      maxStreak: newMaxStreak,
      lastLoginDate: todayStr,
      isNewDay: true,
    };
    saveStoredLoginStreak(userId, result);
    return result;
  } else {
    // Clock skew / past date fallback: keep state safe
    const result: LoginStreakData = {
      streak: currentStreak,
      maxStreak: Math.max(currentStreak, currentMaxStreak),
      lastLoginDate: todayStr,
      isNewDay: false,
    };
    saveStoredLoginStreak(userId, result);
    return result;
  }
}
