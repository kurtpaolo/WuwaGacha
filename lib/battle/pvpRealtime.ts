import { supabase } from "@/lib/supabase/client";
import { BattleMove, BattleTrainer } from "@/lib/battle/types";
import { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeBattleAction =
  | {
      type: "join";
      trainer: BattleTrainer;
      userId?: string;
      clientSessionId?: string;
      isGuest?: boolean;
      senderId: string;
    }
  | {
      type: "host_ready";
      hostTrainer: BattleTrainer;
      bet: number;
      hostUserId?: string;
      hostSessionId?: string;
      isHostGuest?: boolean;
      senderId: string;
    }
  | {
      type: "welcome";
      hostTrainer: BattleTrainer;
      bet: number;
      hostUserId?: string;
      hostSessionId?: string;
      isHostGuest?: boolean;
      senderId: string;
    }
  | { type: "reject"; reason: string; senderId: string }
  | { type: "team_update"; trainer: BattleTrainer; senderId: string }
  | { type: "ready_toggle"; isReady: boolean; senderId: string }
  | { type: "start_battle"; firstTurnUserId: string; bet?: number; senderId: string }
  | {
      type: "move";
      move: BattleMove;
      damage: number;
      isCrit: boolean;
      missed: boolean;
      typeMultiplier: number;
      typeEffectiveness: "super" | "resisted" | "neutral";
      knockedDown: boolean;
      triggeredOneMore: boolean;
      statusApplied?: string;
      healAmount?: number;
      attackerHp: number;
      attackerEnergy: number;
      attackerBarrierHp?: number;
      attackerStatusEffects?: any[];
      defenderHp: number;
      defenderBarrierHp?: number;
      defenderFainted: boolean;
      syncTeammateId?: string;
      syncTeammateName?: string;
      nextTurnUserId?: string;
      senderId: string;
      // 3v3 authoritative state synchronization
      attackerSlot?: number;
      targetSlot?: number;
      senderTrainer?: BattleTrainer;
      receiverTrainer?: BattleTrainer;
      timeline?: any[];
      turnCount?: number;
    }
  | {
      type: "guard";
      nextTurnUserId?: string;
      senderId: string;
      senderTrainer?: BattleTrainer;
      timeline?: any[];
      turnCount?: number;
    }
  | {
      type: "switch";
      targetResonatorIdx: number;
      nextTurnUserId?: string;
      senderId: string;
      senderTrainer?: BattleTrainer;
      timeline?: any[];
    }
  | {
      type: "faint_switch";
      targetResonatorIdx: number;
      senderId: string;
      senderTrainer?: BattleTrainer;
      timeline?: any[];
    }
  | {
      type: "bench_substitute";
      slotIndex: number;
      benchIndex: number;
      senderId: string;
      senderTrainer?: BattleTrainer;
      timeline?: any[];
      nextTurnUserId?: string;
    }
  | {
      type: "ultimate_interrupt";
      slotIndex: number;
      teamIndex: number;
      senderId: string;
      senderTrainer?: BattleTrainer;
      timeline?: any[];
    }
  | { type: "battle_end"; winnerId: string; senderId: string }
  | { type: "leave_room"; senderId: string }
  | { type: "forfeit"; senderId: string }
  | {
      type: "request_sync";
      senderId: string;
    }
  | {
      type: "sync_state";
      senderId: string;
      screen: "room_prep" | "battle";
      senderTrainer: BattleTrainer;
      receiverTrainer?: BattleTrainer;
      isSenderReady?: boolean;
      bet: number;
      timeline?: any[];
      isSenderTurn?: boolean;
      turnCount?: number;
      latestLogs?: any[];
    };

export interface PvpRoomCallbacks {
  onOpponentJoined?: (opponentTrainer: BattleTrainer) => void;
  onOpponentWelcome?: (hostTrainer: BattleTrainer, bet: number) => void;
  onOpponentTeamUpdate?: (updatedTrainer: BattleTrainer) => void;
  onOpponentReadyToggle?: (isReady: boolean) => void;
  onBattleStart?: (firstTurnUserId: string, bet?: number) => void;
  onOpponentAction?: (action: RealtimeBattleAction) => void;
  onOpponentDisconnected?: () => void;
  onOpponentReconnecting?: (isReconnecting: boolean) => void;
  onRequestSync?: () => void;
  onSyncState?: (action: Extract<RealtimeBattleAction, { type: "sync_state" }>) => void;
  onError?: (err: string) => void;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "W-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class PvpRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private roomCode: string | null = null;
  private isHost: boolean = false;
  private callbacks: PvpRoomCallbacks = {};
  private myTrainer: BattleTrainer | null = null;
  private bet: number = 0;
  private currentUserId?: string;
  private clientSessionId?: string;
  private isGuest: boolean = false;
  private joinRetryInterval: NodeJS.Timeout | null = null;
  private disconnectGraceTimer: NodeJS.Timeout | null = null;
  private isOpponentConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private authMeta?: { userId?: string; clientSessionId?: string; isGuest?: boolean };

  constructor(callbacks: PvpRoomCallbacks) {
    this.callbacks = callbacks;
  }

  public updateCallbacks(callbacks: PvpRoomCallbacks) {
    this.callbacks = callbacks;
  }

  public joinRoom(
    roomCode: string,
    myTrainer: BattleTrainer,
    bet: number,
    asHost: boolean,
    authMeta?: { userId?: string; clientSessionId?: string; isGuest?: boolean }
  ) {
    this.leaveRoom();
    this.roomCode = roomCode.toUpperCase().trim();
    this.isHost = asHost;
    this.myTrainer = myTrainer;
    this.bet = bet;
    this.authMeta = authMeta;
    this.currentUserId = authMeta?.userId;
    this.clientSessionId = authMeta?.clientSessionId;
    this.isGuest = Boolean(authMeta?.isGuest);
    this.isOpponentConnected = false;

    const channelName = `pvp_battle_${this.roomCode}`;
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: true, self: false },
        presence: { key: myTrainer.id },
      },
    });

    const clearDisconnectGrace = () => {
      if (this.disconnectGraceTimer) {
        clearTimeout(this.disconnectGraceTimer);
        this.disconnectGraceTimer = null;
      }
      this.callbacks.onOpponentReconnecting?.(false);
    };

    // Listen for broadcast events
    this.channel.on("broadcast", { event: "battle_event" }, ({ payload }) => {
      const action = payload as RealtimeBattleAction;
      if (!action || !action.type) return;

      // Any action from opponent proves they are actively connected
      clearDisconnectGrace();

      if (action.type === "join") {
        // Anti-Self-Matching Check
        const isSameTrainer = Boolean(this.myTrainer && action.trainer.id === this.myTrainer.id);
        const isSameAccount = Boolean(this.currentUserId && action.userId && action.userId === this.currentUserId);
        const isSameDevice = Boolean(this.clientSessionId && action.clientSessionId && action.clientSessionId === this.clientSessionId);

        if (isSameTrainer || isSameAccount || isSameDevice) {
          this.sendAction({
            type: "reject",
            reason: "Self-matching is prohibited. You cannot battle against your own account or device.",
            senderId: this.myTrainer?.id || "",
          });
          this.callbacks.onError?.("Blocked connection attempt from your own account or device.");
          return;
        }

        // Anti-Currency Laundering Check: Guest vs Registered for stakes
        if (this.bet > 0 && (action.isGuest || this.isGuest)) {
          this.sendAction({
            type: "reject",
            reason: "Astrite stakes require registered accounts on both sides. Guests can only play Casual matches.",
            senderId: this.myTrainer?.id || "",
          });
          this.callbacks.onError?.("Staked match connection rejected: Guest accounts can only play Casual matches.");
          return;
        }

        // Host receives joiner! Respond with welcome containing host team & bet
        this.isOpponentConnected = true;
        this.callbacks.onOpponentJoined?.(action.trainer);
        if (this.isHost && this.myTrainer) {
          this.sendAction({
            type: "welcome",
            hostTrainer: this.myTrainer,
            bet: this.bet,
            hostUserId: this.currentUserId,
            hostSessionId: this.clientSessionId,
            isHostGuest: this.isGuest,
            senderId: this.myTrainer.id,
          });
        }
      } else if (action.type === "host_ready") {
        // Host has subscribed and announced readiness! If we are Joiner and not connected, send join immediately
        if (!this.isHost && this.myTrainer && !this.isOpponentConnected) {
          this.sendAction({
            type: "join",
            trainer: this.myTrainer,
            userId: this.currentUserId,
            clientSessionId: this.clientSessionId,
            isGuest: this.isGuest,
            senderId: this.myTrainer.id,
          });
        }
      } else if (action.type === "welcome") {
        // Joiner receives host! Check anti-self-matching and anti-currency laundering
        const isSameTrainer = Boolean(this.myTrainer && action.hostTrainer.id === this.myTrainer.id);
        const isSameAccount = Boolean(this.currentUserId && action.hostUserId && action.hostUserId === this.currentUserId);
        const isSameDevice = Boolean(this.clientSessionId && action.hostSessionId && action.hostSessionId === this.clientSessionId);

        if (isSameTrainer || isSameAccount || isSameDevice) {
          this.callbacks.onError?.("Self-matching is prohibited. You cannot battle against your own account or device.");
          this.leaveRoom();
          return;
        }

        if (action.bet > 0 && (this.isGuest || action.isHostGuest)) {
          this.callbacks.onError?.("Astrite stakes require registered accounts on both sides. Guests can only play Casual matches.");
          this.leaveRoom();
          return;
        }

        this.isOpponentConnected = true;
        if (this.joinRetryInterval) {
          clearInterval(this.joinRetryInterval);
          this.joinRetryInterval = null;
        }
        this.callbacks.onOpponentWelcome?.(action.hostTrainer, action.bet);
      } else if (action.type === "reject") {
        this.callbacks.onError?.(action.reason || "Match connection was rejected.");
        this.leaveRoom();
      } else if (action.type === "team_update") {
        this.callbacks.onOpponentTeamUpdate?.(action.trainer);
      } else if (action.type === "ready_toggle") {
        this.callbacks.onOpponentReadyToggle?.(action.isReady);
      } else if (action.type === "start_battle") {
        this.callbacks.onBattleStart?.(action.firstTurnUserId, action.bet);
      } else if (action.type === "request_sync") {
        this.callbacks.onRequestSync?.();
      } else if (action.type === "sync_state") {
        this.callbacks.onSyncState?.(action);
      } else if (action.type === "leave_room") {
        clearDisconnectGrace();
        this.callbacks.onOpponentDisconnected?.();
      } else {
        this.callbacks.onOpponentAction?.(action);
      }
    });

    // Listen for presence sync to recover from backgrounding / alt-tabs
    this.channel.on("presence", { event: "sync" }, () => {
      if (!this.channel || !this.myTrainer) return;
      const state = this.channel.presenceState();
      const peerKeys = Object.keys(state).filter((k) => k !== this.myTrainer?.id);

      if (peerKeys.length > 0) {
        // Peer is active in presence! Clear any disconnect grace timer
        clearDisconnectGrace();

        // If Host and joiner is present but we haven't welcomed them yet:
        if (this.isHost && !this.isOpponentConnected) {
          this.sendAction({
            type: "host_ready",
            hostTrainer: this.myTrainer,
            bet: this.bet,
            hostUserId: this.currentUserId,
            hostSessionId: this.clientSessionId,
            isHostGuest: this.isGuest,
            senderId: this.myTrainer.id,
          });
        }
      }
    });

    // Listen for presence disconnects with a 12-second grace period for Alt-Tabs
    this.channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      if (leftPresences && leftPresences.length > 0) {
        const leftKey =
          (leftPresences[0] as any)?.key || (leftPresences[0] as any)?.id;
        if (leftKey && leftKey !== myTrainer.id && this.isOpponentConnected) {
          // Do not immediately terminate on alt-tab! Give 12 seconds grace period
          this.callbacks.onOpponentReconnecting?.(true);
          if (this.disconnectGraceTimer) clearTimeout(this.disconnectGraceTimer);
          this.disconnectGraceTimer = setTimeout(() => {
            this.callbacks.onOpponentDisconnected?.();
          }, 12000);
        }
      }
    });

    this.channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        await this.channel?.track({
          id: myTrainer.id,
          username: myTrainer.username,
          avatarId: myTrainer.avatarId,
          asHost,
        });

        if (asHost) {
          // Announce host readiness so any waiting joiner immediately connects
          await this.sendAction({
            type: "host_ready",
            hostTrainer: myTrainer,
            bet: this.bet,
            hostUserId: this.currentUserId,
            hostSessionId: this.clientSessionId,
            isHostGuest: this.isGuest,
            senderId: myTrainer.id,
          });
        } else {
          // If joiner, announce join immediately and start 1s retry interval
          const sendJoin = () => {
            if (this.isOpponentConnected) return;
            this.sendAction({
              type: "join",
              trainer: myTrainer,
              userId: this.currentUserId,
              clientSessionId: this.clientSessionId,
              isGuest: this.isGuest,
              senderId: myTrainer.id,
            });
          };

          sendJoin();

          // Retry sending join every 1s (up to 15s) in case host was still subscribing
          let attempts = 0;
          if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
          this.joinRetryInterval = setInterval(() => {
            attempts++;
            if (this.isOpponentConnected || attempts >= 15) {
              if (this.joinRetryInterval) {
                clearInterval(this.joinRetryInterval);
                this.joinRetryInterval = null;
              }
              if (!this.isOpponentConnected && attempts >= 15) {
                this.callbacks.onError?.("Could not reach room host. Please check room code.");
              }
              return;
            }
            sendJoin();
          }, 1000);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        if (this.roomCode && this.myTrainer && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.roomCode && this.myTrainer) {
              this.joinRoom(this.roomCode, this.myTrainer, this.bet, this.isHost, this.authMeta);
            }
          }, 2000);
        }
      }
    });
  }

  public async sendAction(action: RealtimeBattleAction) {
    if (!this.channel) return;
    try {
      await this.channel.send({
        type: "broadcast",
        event: "battle_event",
        payload: action,
      });
    } catch (e) {
      console.error("Error sending realtime action:", e);
    }
  }

  public updateMyTrainer(updatedTrainer: BattleTrainer) {
    this.myTrainer = updatedTrainer;
    if (this.channel) {
      this.sendAction({
        type: "team_update",
        trainer: updatedTrainer,
        senderId: updatedTrainer.id,
      });
    }
  }

  public async resyncOnFocus() {
    if (!this.roomCode || !this.myTrainer) return;

    if (this.channel && (this.channel.state === "joined" || this.channel.state === "joining")) {
      try {
        await this.channel.track({
          id: this.myTrainer.id,
          username: this.myTrainer.username,
          avatarId: this.myTrainer.avatarId,
          asHost: this.isHost,
        });

        // Request sync from opponent in case actions were missed while tab was inactive
        this.sendAction({
          type: "request_sync",
          senderId: this.myTrainer.id,
        });
      } catch (e) {
        console.warn("Error re-tracking on focus in pvpRealtime:", e);
      }
      return;
    }

    // If channel disconnected, reconnect
    if (this.roomCode && this.myTrainer) {
      this.joinRoom(this.roomCode, this.myTrainer, this.bet, this.isHost, this.authMeta);
    }
  }

  public leaveRoom() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.joinRetryInterval) {
      clearInterval(this.joinRetryInterval);
      this.joinRetryInterval = null;
    }
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.roomCode = null;
    this.myTrainer = null;
    this.isOpponentConnected = false;
  }
}
