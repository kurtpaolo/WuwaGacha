"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export type SessionMessage =
  | {
      type: "CLAIM_SESSION";
      userId: string;
      sessionId: string;
      timestamp: number;
    }
  | {
      type: "PING_SESSION";
      userId: string;
      sessionId: string;
    }
  | {
      type: "PONG_ACTIVE";
      userId: string;
      sessionId: string;
    };

const BROADCAST_CHANNEL_NAME = "wuwa_account_session_v1";
const HEARTBEAT_INTERVAL_MS = 2500;
const STALE_SESSION_MS = 7000;
const PING_WAIT_MS = 400;

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
  const isDisplacedRef = useRef<boolean>(false);

  // Keep ref in sync for synchronous event handlers
  useEffect(() => {
    isDisplacedRef.current = isDisplaced;
  }, [isDisplaced]);

  // Initialize tab session ID once on mount
  useEffect(() => {
    tabSessionIdRef.current = getTabSessionId();
  }, []);

  // Broadcast a claim for this session across BroadcastChannel and localStorage
  const claimSession = useCallback(
    (targetUserId: string) => {
      if (!targetUserId || typeof window === "undefined") return;
      const mySessionId = tabSessionIdRef.current || getTabSessionId();
      tabSessionIdRef.current = mySessionId;

      const payload: SessionMessage = {
        type: "CLAIM_SESSION",
        userId: targetUserId,
        sessionId: mySessionId,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(`wuwa_active_session_${targetUserId}`, JSON.stringify(payload));
      } catch {}

      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage(payload);
        }
      } catch {}

      isDisplacedRef.current = false;
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
      isDisplacedRef.current = false;
      return;
    }

    const mySessionId = tabSessionIdRef.current || getTabSessionId();
    tabSessionIdRef.current = mySessionId;

    let heartbeatTimer: NodeJS.Timeout | null = null;
    let pingTimeout: NodeJS.Timeout | null = null;

    // Start sending periodic heartbeats while this tab is active
    const startHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (isDisplacedRef.current) return;
        try {
          const payload = {
            type: "CLAIM_SESSION" as const,
            userId,
            sessionId: mySessionId,
            timestamp: Date.now(),
          };
          localStorage.setItem(`wuwa_active_session_${userId}`, JSON.stringify(payload));
        } catch {}
      }, HEARTBEAT_INTERVAL_MS);
    };

    // BroadcastChannel setup
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => {
          const data = event.data as SessionMessage;
          if (!data || data.userId !== userId) return;

          if (data.type === "CLAIM_SESSION") {
            if (data.sessionId !== tabSessionIdRef.current) {
              isDisplacedRef.current = true;
              setIsDisplaced(true);
            } else {
              isDisplacedRef.current = false;
              setIsDisplaced(false);
            }
          } else if (data.type === "PING_SESSION") {
            // If another tab is asking if anyone is active and this tab is active, reply PONG
            if (!isDisplacedRef.current && data.sessionId !== tabSessionIdRef.current) {
              try {
                bc?.postMessage({
                  type: "PONG_ACTIVE",
                  userId,
                  sessionId: tabSessionIdRef.current,
                } as SessionMessage);
              } catch {}
            }
          }
        };
      } catch {}
    }

    // Verify existing claim in localStorage
    try {
      const existingRaw = localStorage.getItem(`wuwa_active_session_${userId}`);
      if (existingRaw) {
        const parsed = JSON.parse(existingRaw);
        const age = Date.now() - (parsed?.timestamp || 0);

        // If existing claim is stale (> 7 seconds), claim immediately
        if (age > STALE_SESSION_MS || !parsed?.sessionId) {
          claimSession(userId);
          startHeartbeat();
        } else if (parsed.sessionId === mySessionId) {
          // Already owned by this tab
          claimSession(userId);
          startHeartbeat();
        } else {
          // Claim is recent from another tab: ping BroadcastChannel to confirm if other tab is alive
          let pongReceived = false;

          const handlePong = (event: MessageEvent) => {
            const data = event.data as SessionMessage;
            if (data && data.type === "PONG_ACTIVE" && data.userId === userId && data.sessionId === parsed.sessionId) {
              pongReceived = true;
              isDisplacedRef.current = true;
              setIsDisplaced(true);
            }
          };

          if (bc) {
            bc.addEventListener("message", handlePong);
            bc.postMessage({
              type: "PING_SESSION",
              userId,
              sessionId: mySessionId,
            } as SessionMessage);
          }

          pingTimeout = setTimeout(() => {
            if (bc) {
              bc.removeEventListener("message", handlePong);
            }
            // If no active tab responded within PING_WAIT_MS, the other session is closed/dead
            if (!pongReceived) {
              claimSession(userId);
              startHeartbeat();
            }
          }, PING_WAIT_MS);
        }
      } else {
        // No existing session claim at all
        claimSession(userId);
        startHeartbeat();
      }
    } catch {
      claimSession(userId);
      startHeartbeat();
    }

    // Listen to localStorage storage events from other tabs
    const handleStorage = (event: StorageEvent) => {
      if (event.key === `wuwa_active_session_${userId}` && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed && parsed.userId === userId) {
            const age = Date.now() - (parsed.timestamp || 0);
            if (parsed.sessionId !== tabSessionIdRef.current && age <= STALE_SESSION_MS) {
              isDisplacedRef.current = true;
              setIsDisplaced(true);
            } else if (parsed.sessionId === tabSessionIdRef.current) {
              isDisplacedRef.current = false;
              setIsDisplaced(false);
            }
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Clean up active claim on tab/browser close if this tab owns it
    const handleBeforeUnload = () => {
      try {
        const existingRaw = localStorage.getItem(`wuwa_active_session_${userId}`);
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          if (parsed?.sessionId === tabSessionIdRef.current) {
            localStorage.removeItem(`wuwa_active_session_${userId}`);
          }
        }
      } catch {}
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pingTimeout) clearTimeout(pingTimeout);
      if (bc) {
        try {
          bc.close();
        } catch {}
        broadcastChannelRef.current = null;
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userId, claimSession]);

  return {
    isDisplaced,
    preferThisSession,
    tabSessionId: tabSessionIdRef.current,
  };
}
