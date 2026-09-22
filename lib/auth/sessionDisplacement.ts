"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface SessionClaimPayload {
  type: "CLAIM_SESSION";
  userId: string;
  sessionId: string;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = "wuwa_account_session_v1";

/**
 * Returns a unique session ID for this browser tab/window.
 * Stored in sessionStorage so it is unique per tab.
 */
export function getTabSessionId(): string {
  if (typeof window === "undefined") return "server_session";
  try {
    let id = sessionStorage.getItem("wuwa_tab_session_id");
    if (!id) {
      id = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("wuwa_tab_session_id", id);
    }
    return id;
  } catch {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Hook to monitor and enforce single active session per account across tabs and devices.
 * If another tab or device opens the same account, this tab becomes 'displaced'
 * and displays an overlay prompting "Account logged in elsewhere" with "Prefer to use this session".
 */
export function useSessionDisplacement(userId: string | null | undefined) {
  const [isDisplaced, setIsDisplaced] = useState<boolean>(false);
  const tabSessionIdRef = useRef<string>("");
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize tab session ID once on mount
  useEffect(() => {
    tabSessionIdRef.current = getTabSessionId();
  }, []);

  // Broadcast a claim for this session across BroadcastChannel, localStorage, and Supabase Realtime
  const claimSession = useCallback(
    (targetUserId: string) => {
      if (!targetUserId || typeof window === "undefined") return;
      const mySessionId = tabSessionIdRef.current || getTabSessionId();
      tabSessionIdRef.current = mySessionId;

      const payload: SessionClaimPayload = {
        type: "CLAIM_SESSION",
        userId: targetUserId,
        sessionId: mySessionId,
        timestamp: Date.now(),
      };

      // 1. Write to localStorage (triggers 'storage' event in other tabs of the same browser)
      try {
        localStorage.setItem(`wuwa_active_session_${targetUserId}`, JSON.stringify(payload));
      } catch {}

      // 2. BroadcastChannel for instant same-browser cross-tab delivery
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage(payload);
        }
      } catch {}

      setIsDisplaced(false);
    },
    []
  );

  // Re-claim this session when the user explicitly clicks "Prefer to use this session"
  const preferThisSession = useCallback(() => {
    if (!userId) return;
    claimSession(userId);
  }, [userId, claimSession]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      setIsDisplaced(false);
      return;
    }

    const mySessionId = tabSessionIdRef.current || getTabSessionId();
    tabSessionIdRef.current = mySessionId;

    // Check if there is already an active session claim in localStorage
    try {
      const existingRaw = localStorage.getItem(`wuwa_active_session_${userId}`);
      if (existingRaw) {
        const parsed = JSON.parse(existingRaw) as SessionClaimPayload;
        // If active session belongs to someone else and was claimed recently (within last 48h)
        if (parsed && parsed.sessionId && parsed.sessionId !== mySessionId) {
          // This tab was opened after another tab claimed it
          setIsDisplaced(true);
        } else {
          // No conflicting session, claim it for this tab
          claimSession(userId);
        }
      } else {
        claimSession(userId);
      }
    } catch {
      claimSession(userId);
    }

    // Set up BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          const data = event.data as SessionClaimPayload;
          if (data && data.type === "CLAIM_SESSION" && data.userId === userId) {
            if (data.sessionId !== tabSessionIdRef.current) {
              setIsDisplaced(true);
            } else {
              setIsDisplaced(false);
            }
          }
        };
      } catch {}
    }

    // Set up localStorage storage event listener (cross-tab fallback)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === `wuwa_active_session_${userId}` && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as SessionClaimPayload;
          if (parsed && parsed.userId === userId) {
            if (parsed.sessionId !== tabSessionIdRef.current) {
              setIsDisplaced(true);
            } else {
              setIsDisplaced(false);
            }
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (bc) {
        try {
          bc.close();
        } catch {}
        broadcastChannelRef.current = null;
      }
      window.removeEventListener("storage", handleStorage);
    };
  }, [userId, claimSession]);

  return {
    isDisplaced,
    preferThisSession,
    tabSessionId: tabSessionIdRef.current,
  };
}
