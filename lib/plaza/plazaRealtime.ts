import { supabase } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { PlazaChatMessage, PlazaPlayer } from "./plazaTypes";

export interface PlazaRealtimeCallbacks {
  onPlayerWaypoint: (senderId: string, targetX: number, targetY: number, facing: "left" | "right", isStop?: boolean, timestamp?: number) => void;
  onPlayerHello?: (payload: { senderId: string; username: string; avatarId: string; title?: string; x: number; y: number; facing: "left" | "right" }) => void;
  onChatMessage: (msg: PlazaChatMessage) => void;
  onPlayerEmote: (senderId: string, emoji: string) => void;
  onPresenceSync: (onlinePlayers: Map<string, { username: string; avatarId: string; title?: string; x?: number; y?: number; facing?: "left" | "right" }>) => void;
  onSleepStateChange: (isSleeping: boolean) => void;
  onChallengeRequest?: (payload: {
    challengerId: string;
    challengerUsername: string;
    challengerAvatarId: string;
    targetId: string;
    bet: number;
    roomCode: string;
  }) => void;
  onChallengeResponse?: (payload: {
    challengerId: string;
    targetId: string;
    targetUsername: string;
    accepted: boolean;
    bet: number;
    roomCode: string;
    reason?: string;
  }) => void;
  onChallengeCancel?: (payload: {
    challengerId: string;
    targetId: string;
    roomCode: string;
  }) => void;
}

const MIN_WAYPOINT_INTERVAL_MS = 100;  // 100ms responsive real-time streaming
const MIN_CHAT_INTERVAL_MS = 200;      // 200ms throttle to allow rapid multi-bubble chatting
const IDLE_SLEEP_TIMEOUT_MS = 180000;  // 3 minutes of zero interaction -> sleep to free connection

export class PlazaRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private callbacks: PlazaRealtimeCallbacks;
  private myPlayer: PlazaPlayer | null = null;
  private lobbyId: number = 1;
  private lastWaypointBroadcast: number = 0;
  private lastChatBroadcast: number = 0;
  private idleTimer: NodeJS.Timeout | null = null;
  private isSleeping: boolean = false;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private challengeHeartbeatInterval: NodeJS.Timeout | null = null;
  private responseHeartbeatInterval: NodeJS.Timeout | null = null;

  constructor(callbacks: PlazaRealtimeCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: PlazaRealtimeCallbacks) {
    this.callbacks = callbacks;
  }

  public updatePlayerProfile(avatarId: string, username: string, title?: string) {
    if (this.myPlayer) {
      this.myPlayer.avatarId = avatarId;
      this.myPlayer.username = username;
      this.myPlayer.title = title;
    }
    if (this.channel && this.isConnected && this.myPlayer) {
      this.channel.track({
        username: this.myPlayer.username,
        avatarId: this.myPlayer.avatarId,
        title: this.myPlayer.title,
        x: Math.round(this.myPlayer.x * 10) / 10,
        y: Math.round(this.myPlayer.y * 10) / 10,
        facing: this.myPlayer.facing,
        joinedAt: Date.now(),
      });
    }
  }

  public updatePosition(x: number, y: number, facing: "left" | "right") {
    if (this.myPlayer) {
      this.myPlayer.x = x;
      this.myPlayer.y = y;
      this.myPlayer.facing = facing;
    }
    if (this.channel && this.isConnected && this.myPlayer) {
      this.channel.track({
        username: this.myPlayer.username,
        avatarId: this.myPlayer.avatarId,
        title: this.myPlayer.title,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        facing,
        joinedAt: Date.now(),
      });
    }
  }

  private handleWindowUnload = () => {
    if (this.channel) {
      try {
        this.channel.untrack();
      } catch {}
    }
  };

  public init(myPlayer: PlazaPlayer, initialLobbyId: number = 1) {
    this.myPlayer = myPlayer;
    this.lobbyId = initialLobbyId;
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleWindowUnload);
      window.addEventListener("pagehide", this.handleWindowUnload);
    }
    this.connect();
    this.resetIdleTimer();
  }

  public getLobbyId(): number {
    return this.lobbyId;
  }

  public async switchLobby(newLobbyId: number) {
    if (this.lobbyId === newLobbyId && this.channel) return;
    await this.disconnect();
    this.lobbyId = newLobbyId;
    await this.connect();
    this.resetIdleTimer();
  }

  public async connect() {
    if (this.isConnecting || !this.myPlayer) return;
    if (this.channel && (this.channel.state === "joined" || this.channel.state === "joining")) {
      return;
    }

    this.isConnecting = true;
    this.isSleeping = false;
    this.callbacks.onSleepStateChange(false);

    const channelName = `plaza_lobby_${this.lobbyId}`;

    // Safely remove any existing channel instance for this lobby from supabase client before recreating
    const existing = supabase.getChannels().find(
      (c) => c.topic === `realtime:${channelName}` || c.topic === channelName
    );
    if (existing) {
      try {
        existing.untrack();
      } catch {}
      try {
        await supabase.removeChannel(existing);
      } catch {}
    }

    try {
      this.channel = supabase.channel(channelName, {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: this.myPlayer.id },
        },
      });

      // 0. New player handshake: announce presence and request peer positions
      this.channel.on("broadcast", { event: "player_hello" }, ({ payload }) => {
        if (!payload || !payload.senderId || payload.senderId === this.myPlayer?.id) return;
        this.callbacks.onPlayerHello?.(payload);
      });

      // 1. Waypoint movement broadcasts
      this.channel.on("broadcast", { event: "player_move" }, ({ payload }) => {
        if (!payload || !payload.senderId || payload.senderId === this.myPlayer?.id) return;
        this.callbacks.onPlayerWaypoint(
          payload.senderId,
          payload.targetX,
          payload.targetY,
          payload.facing || "right",
          !!payload.isStop,
          payload.timestamp
        );
      });

      // 2. Realtime ephemeral chat broadcasts (0 DB writes)
      this.channel.on("broadcast", { event: "player_chat" }, ({ payload }) => {
        if (!payload || !payload.text) return;
        this.callbacks.onChatMessage(payload as PlazaChatMessage);
      });

      // 3. Realtime emote broadcasts
      this.channel.on("broadcast", { event: "player_emote" }, ({ payload }) => {
        if (!payload || !payload.senderId || !payload.emoji) return;
        this.callbacks.onPlayerEmote(payload.senderId, payload.emoji);
      });

      // 4. Realtime player challenge request
      this.channel.on("broadcast", { event: "player_challenge_request" }, ({ payload }) => {
        if (!payload || !this.myPlayer || payload.targetId !== this.myPlayer.id) return;
        this.callbacks.onChallengeRequest?.(payload);
      });

      // 5. Realtime player challenge response
      this.channel.on("broadcast", { event: "player_challenge_response" }, ({ payload }) => {
        if (!payload || !this.myPlayer) return;
        if (payload.challengerId === this.myPlayer.id || payload.targetId === this.myPlayer.id) {
          this.callbacks.onChallengeResponse?.(payload);
        }
      });

      // 6. Realtime player challenge cancellation
      this.channel.on("broadcast", { event: "player_challenge_cancel" }, ({ payload }) => {
        if (!payload || !this.myPlayer) return;
        if (payload.challengerId === this.myPlayer.id || payload.targetId === this.myPlayer.id) {
          this.callbacks.onChallengeCancel?.(payload);
        }
      });

      // 4. Presence tracking (Who is currently in the plaza with their exact coordinates)
      this.channel.on("presence", { event: "sync" }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        const onlineMap = new Map<string, { username: string; avatarId: string; title?: string; x?: number; y?: number; facing?: "left" | "right" }>();

        for (const key of Object.keys(state)) {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[0];
            onlineMap.set(key, {
              username: p.username || "Rover",
              avatarId: p.avatarId || "rover_male",
              title: p.title,
              x: typeof p.x === "number" ? p.x : undefined,
              y: typeof p.y === "number" ? p.y : undefined,
              facing: p.facing || "right",
            });
          }
        }
        this.callbacks.onPresenceSync(onlineMap);
      });

      this.channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && this.myPlayer) {
          this.isConnected = true;
          await this.channel?.track({
            username: this.myPlayer.username,
            avatarId: this.myPlayer.avatarId,
            title: this.myPlayer.title,
            x: Math.round(this.myPlayer.x * 10) / 10,
            y: Math.round(this.myPlayer.y * 10) / 10,
            facing: this.myPlayer.facing,
            joinedAt: Date.now(),
          });

          // Broadcast hello with current position so peers can greet us and reply with their positions
          this.channel?.send({
            type: "broadcast",
            event: "player_hello",
            payload: {
              senderId: this.myPlayer.id,
              username: this.myPlayer.username,
              avatarId: this.myPlayer.avatarId,
              title: this.myPlayer.title,
              x: Math.round(this.myPlayer.x * 10) / 10,
              y: Math.round(this.myPlayer.y * 10) / 10,
              facing: this.myPlayer.facing,
            },
          });
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          this.isConnected = false;
          if (!this.isSleeping && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(async () => {
              this.reconnectTimer = null;
              if (!this.isSleeping) {
                await this.disconnect();
                await this.connect();
              }
            }, 3000);
          }
        }
      });
    } catch (err) {
      console.error("Error setting up plaza channel:", err);
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ch = this.channel;
    this.channel = null;
    this.isConnected = false;
    if (ch) {
      try {
        ch.untrack();
      } catch {}
      try {
        await supabase.removeChannel(ch);
      } catch (e) {
        console.error("Error leaving plaza channel:", e);
      }
    }
  }

  public async resyncOnFocus() {
    this.wake();
    if (this.isSleeping) return;

    // If channel is already active and healthy, NEVER disconnect and recreate! Just re-track!
    if (this.channel && (this.channel.state === "joined" || this.channel.state === "joining")) {
      this.isConnected = true;
      if (this.myPlayer) {
        try {
          await this.channel.track({
            username: this.myPlayer.username,
            avatarId: this.myPlayer.avatarId,
            title: this.myPlayer.title,
            x: Math.round(this.myPlayer.x * 10) / 10,
            y: Math.round(this.myPlayer.y * 10) / 10,
            facing: this.myPlayer.facing,
            joinedAt: Date.now(),
          });
          this.channel.send({
            type: "broadcast",
            event: "player_hello",
            payload: {
              senderId: this.myPlayer.id,
              username: this.myPlayer.username,
              avatarId: this.myPlayer.avatarId,
              title: this.myPlayer.title,
              x: Math.round(this.myPlayer.x * 10) / 10,
              y: Math.round(this.myPlayer.y * 10) / 10,
              facing: this.myPlayer.facing,
            },
          });
        } catch (e) {
          console.warn("Error re-tracking on focus:", e);
        }
      }
      return;
    }

    // Channel is either null, closed, or errored -> perform clean safe reconnect
    await this.disconnect();
    await this.connect();
  }

  public sleep() {
    if (this.isSleeping) return;
    this.isSleeping = true;
    this.disconnect();
    this.callbacks.onSleepStateChange(true);
  }

  public wake() {
    this.resetIdleTimer();
    if (this.isSleeping) {
      this.connect();
    }
  }

  public resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.sleep();
    }, IDLE_SLEEP_TIMEOUT_MS);
  }

  /**
   * Broadcasts target destination waypoint with 100ms throttle or instant on stop
   */
  public broadcastWaypoint(targetX: number, targetY: number, facing: "left" | "right", force: boolean = false) {
    this.wake();
    if (!this.channel || !this.isConnected || !this.myPlayer) return;

    const now = Date.now();
    if (!force && now - this.lastWaypointBroadcast < MIN_WAYPOINT_INTERVAL_MS) {
      return;
    }
    this.lastWaypointBroadcast = now;

    this.channel.send({
      type: "broadcast",
      event: "player_move",
      payload: {
        senderId: this.myPlayer.id,
        targetX: Math.round(targetX * 10) / 10,
        targetY: Math.round(targetY * 10) / 10,
        facing,
        isStop: force,
        timestamp: now,
      },
    });
  }

  /**
   * Broadcasts ephemeral chat message directly to peers with 1.5s cooldown (0 DB writes)
   */
  public broadcastChat(text: string): boolean {
    this.wake();
    if (!this.channel || !this.isConnected || !this.myPlayer) return false;

    const trimmed = text.trim();
    if (!trimmed) return false;

    const now = Date.now();
    if (now - this.lastChatBroadcast < MIN_CHAT_INTERVAL_MS) {
      return false; // Spam prevention
    }
    this.lastChatBroadcast = now;

    const message: PlazaChatMessage = {
      id: `msg_${now}_${Math.random().toString(36).slice(2, 7)}`,
      senderId: this.myPlayer.id,
      senderName: this.myPlayer.username,
      senderAvatarId: this.myPlayer.avatarId,
      senderTitle: this.myPlayer.title,
      text: trimmed.slice(0, 120), // Max 120 chars to keep payloads small
      timestamp: now,
    };

    this.channel.send({
      type: "broadcast",
      event: "player_chat",
      payload: message,
    });

    return true;
  }

  /**
   * Broadcasts quick animated pixel emote
   */
  public broadcastEmote(emoji: string) {
    this.wake();
    if (!this.channel || !this.isConnected || !this.myPlayer) return;

    this.channel.send({
      type: "broadcast",
      event: "player_emote",
      payload: {
        senderId: this.myPlayer.id,
        emoji,
      },
    });

    this.callbacks.onPlayerEmote(this.myPlayer.id, emoji);
  }

  /**
   * Sends a 1v1 PvP challenge to a nearby peer player with heartbeat retry pulse
   */
  public sendChallenge(targetId: string, bet: number, roomCode: string) {
    this.wake();
    if (!this.myPlayer) return;

    const payload = {
      challengerId: this.myPlayer.id,
      challengerUsername: this.myPlayer.username,
      challengerAvatarId: this.myPlayer.avatarId,
      targetId,
      bet,
      roomCode,
      timestamp: Date.now(),
    };

    const doSend = () => {
      if (this.channel && this.isConnected) {
        this.channel.send({
          type: "broadcast",
          event: "player_challenge_request",
          payload,
        });
      }
    };

    doSend();

    if (this.challengeHeartbeatInterval) {
      clearInterval(this.challengeHeartbeatInterval);
      this.challengeHeartbeatInterval = null;
    }

    // Repeat challenge ping every 2.5s for up to 28s to ensure alt-tabbed opponent receives it
    let attempts = 0;
    this.challengeHeartbeatInterval = setInterval(() => {
      attempts++;
      if (attempts >= 11) {
        if (this.challengeHeartbeatInterval) {
          clearInterval(this.challengeHeartbeatInterval);
          this.challengeHeartbeatInterval = null;
        }
        return;
      }
      doSend();
    }, 2500);
  }

  /**
   * Responds to an incoming 1v1 PvP challenge (accepted or declined) with repeat pulse if accepted
   */
  public respondChallenge(
    challengerId: string,
    accepted: boolean,
    roomCode: string,
    bet: number,
    reason?: string
  ) {
    this.wake();
    if (!this.myPlayer) return;

    if (this.challengeHeartbeatInterval) {
      clearInterval(this.challengeHeartbeatInterval);
      this.challengeHeartbeatInterval = null;
    }

    const payload = {
      challengerId,
      targetId: this.myPlayer.id,
      targetUsername: this.myPlayer.username,
      accepted,
      bet,
      roomCode,
      reason,
      timestamp: Date.now(),
    };

    const doSend = () => {
      if (this.channel && this.isConnected) {
        this.channel.send({
          type: "broadcast",
          event: "player_challenge_response",
          payload,
        });
      }
    };

    doSend();

    if (this.responseHeartbeatInterval) {
      clearInterval(this.responseHeartbeatInterval);
      this.responseHeartbeatInterval = null;
    }

    if (accepted) {
      // Repeat accept response every 1.5s for 6s so challenger receives it even if alt-tabbed
      let count = 0;
      this.responseHeartbeatInterval = setInterval(() => {
        count++;
        if (count >= 4) {
          if (this.responseHeartbeatInterval) {
            clearInterval(this.responseHeartbeatInterval);
            this.responseHeartbeatInterval = null;
          }
          return;
        }
        doSend();
      }, 1500);
    }
  }

  /**
   * Cancels an outgoing 1v1 PvP challenge
   */
  public cancelChallenge(targetId: string, roomCode: string) {
    this.stopChallengePulse();
    if (!this.channel || !this.isConnected || !this.myPlayer) return;

    this.channel.send({
      type: "broadcast",
      event: "player_challenge_cancel",
      payload: {
        challengerId: this.myPlayer.id,
        targetId,
        roomCode,
      },
    });
  }

  /**
   * Stops all active challenge or response heartbeat pulses
   */
  public stopChallengePulse() {
    if (this.challengeHeartbeatInterval) {
      clearInterval(this.challengeHeartbeatInterval);
      this.challengeHeartbeatInterval = null;
    }
    if (this.responseHeartbeatInterval) {
      clearInterval(this.responseHeartbeatInterval);
      this.responseHeartbeatInterval = null;
    }
  }

  public async destroy() {
    this.stopChallengePulse();
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleWindowUnload);
      window.removeEventListener("pagehide", this.handleWindowUnload);
    }
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.disconnect();
  }
}
