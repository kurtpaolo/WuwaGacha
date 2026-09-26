export interface PlazaCoordinates {
  x: number; // 0 to 100 percentage of plaza width
  y: number; // 0 to 100 percentage of plaza height
}

export interface PlazaSpeechBubble {
  id: string;
  text: string;
  expiresAt: number;
}

export interface PlazaPlayer {
  id: string;
  username: string;
  avatarId: string;
  title?: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: "left" | "right";
  isMoving: boolean;
  isSleeping: boolean;
  lastActive: number;
  currentEmote?: {
    emoji: string;
    expiresAt: number;
  };
  activeSpeechBubble?: {
    text: string;
    expiresAt: number;
  };
  speechBubbles?: PlazaSpeechBubble[];
}

export interface PlazaNpcAction {
  label: string;
  actionId:
    | "convene"
    | "arena"
    | "inventory"
    | "profile"
    | "tacet"
    | "minigame_coinflip"
    | "minigame_slots"
    | "minigame_blackjack"
    | "minigame_dice"
    | "minigame_roulette"
    | "minigame_wheel"
    | "minigame_scratch";
  variant?: "primary" | "secondary" | "accent";
}

export interface PlazaNpc {
  id: string;
  name: string;
  spriteId: string;
  title: string;
  service?: string;
  x: number;
  y: number;
  facing: "left" | "right";
  greeting: string;
  actions: PlazaNpcAction[];
}

export interface PlazaChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarId: string;
  senderTitle?: string;
  text: string;
  timestamp: number;
}

export interface PlazaPortal {
  id: "convene" | "arena" | "tacet" | "inventory";
  name: string;
  subtitle: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  accentColor: string;
  icon: string;
}

export type PlazaEmoteType = "wave" | "cheer" | "flex" | "heart" | "laugh" | "sparkles";

export const PLAZA_MAX_PLAYERS_PER_LOBBY = 10;

export interface PlazaLobbyInfo {
  id: number;
  name: string;
  maxPlayers: number;
}

export const DEFAULT_PLAZA_LOBBIES: PlazaLobbyInfo[] = [
  { id: 1, name: "Channel 1", maxPlayers: PLAZA_MAX_PLAYERS_PER_LOBBY },
  { id: 2, name: "Channel 2", maxPlayers: PLAZA_MAX_PLAYERS_PER_LOBBY },
  { id: 3, name: "Channel 3", maxPlayers: PLAZA_MAX_PLAYERS_PER_LOBBY },
  { id: 4, name: "Channel 4", maxPlayers: PLAZA_MAX_PLAYERS_PER_LOBBY },
  { id: 5, name: "Channel 5", maxPlayers: PLAZA_MAX_PLAYERS_PER_LOBBY },
];
