"use client";

import React, { useState, useRef, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { PlazaPlayer, PlazaNpc } from "@/lib/plaza/plazaTypes";
import { getPortraitFileName, DEFAULT_AVATAR_ID } from "@/lib/data/portraits";
import { SPRITE_MAP } from "@/lib/battle/resonatorMoves";
import {
  X,
  Compass,
  Users,
  Sparkles,
  Swords,
  Briefcase,
  User,
  Radio,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
} from "lucide-react";

interface PlazaMiniMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  localPlayer: PlazaPlayer;
  peerPlayers: Map<string, PlazaPlayer>;
  npcs: PlazaNpc[];
  currentLobbyId: number;
  onlineCount: number;
  onSelectNpc?: (npc: PlazaNpc) => void;
  onTrackNpc?: (npc: PlazaNpc) => void;
  trackedNpcId?: string;
}

// Error Boundary to prevent any minimap errors from bubbling to app/error.tsx (500 page)
class MiniMapErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MiniMap error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          onClick={this.props.onClose}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0c1017] border border-yellow-400/40 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-400">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <h3 className="text-white font-mono font-bold text-sm uppercase tracking-wider">
              Tactical Map Notice
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              {this.state.error?.message || "An issue occurred while rendering the map view."}
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-mono font-bold text-xs transition-transform active:scale-95 cursor-pointer"
              >
                Reload Map
              </button>
              <button
                type="button"
                onClick={this.props.onClose}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PlazaMiniMapModalContent: React.FC<PlazaMiniMapModalProps> = ({
  isOpen,
  onClose,
  localPlayer,
  peerPlayers,
  npcs,
  currentLobbyId,
  onlineCount,
  onSelectNpc,
  onTrackNpc,
  trackedNpcId,
}) => {
  // Zoom & Pan state for interactive overworld map inspection
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const peerList = useMemo(() => {
    if (!peerPlayers) return [];
    if (peerPlayers instanceof Map) {
      return Array.from(peerPlayers.values());
    }
    if (Array.isArray(peerPlayers)) {
      return peerPlayers;
    }
    return [];
  }, [peerPlayers]);

  const npcList = useMemo(() => {
    if (!Array.isArray(npcs)) return [];
    return npcs;
  }, [npcs]);

  const playerX = typeof localPlayer?.x === "number" ? localPlayer.x : 50.17;
  const playerY = typeof localPlayer?.y === "number" ? localPlayer.y : 50.25;

  // Calculate cardinal direction and distance from player to an entity
  const getRelativePosition = (targetX: number, targetY: number) => {
    const tX = typeof targetX === "number" ? targetX : 0;
    const tY = typeof targetY === "number" ? targetY : 0;
    const dx = tX - playerX;
    const dy = tY - playerY;
    const distVal = Math.hypot(dx, dy);
    const dist = isNaN(distVal) ? 0 : Math.round(distVal);

    let direction = "";
    if (Math.abs(dy) > Math.abs(dx) * 0.5) {
      direction += dy < 0 ? "North" : "South";
    }
    if (Math.abs(dx) > Math.abs(dy) * 0.5) {
      direction += dx < 0 ? "West" : "East";
    }
    if (!direction) direction = "Nearby";

    return { direction, dist };
  };

  // Clamping function to guarantee map never pans outside the container bounds
  const clampPan = (targetX: number, targetY: number, targetZoom: number): { x: number; y: number } => {
    if (targetZoom <= 1 || !containerRef.current) {
      return { x: 0, y: 0 };
    }
    const w = containerRef.current.clientWidth || 0;
    const h = containerRef.current.clientHeight || 0;
    const minX = w * (1 - targetZoom);
    const maxX = 0;
    const minY = h * (1 - targetZoom);
    const maxY = 0;

    return {
      x: Math.min(maxX, Math.max(minX, targetX)),
      y: Math.min(maxY, Math.max(minY, targetY)),
    };
  };

  // Direction angle calculation for local player heading arrow
  const playerHeadingDeg = useMemo(() => {
    if (localPlayer?.isMoving && localPlayer.targetX !== undefined && localPlayer.targetY !== undefined) {
      const dx = localPlayer.targetX - playerX;
      const dy = localPlayer.targetY - playerY;
      if (Math.hypot(dx, dy) > 0.05) {
        return Math.atan2(dy, dx) * (180 / Math.PI);
      }
    }
    return localPlayer?.facing === "left" ? 180 : 0;
  }, [localPlayer?.isMoving, localPlayer?.targetX, localPlayer?.targetY, localPlayer?.facing, playerX, playerY]);

  // Pointer drag events for panning map
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return; // At 1x, panning is completely locked edge-to-edge
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    try {
      const el = e.target as HTMLElement;
      el.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan(clampPan(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy, zoom));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        const el = e.target as HTMLElement;
        if (el?.hasPointerCapture?.(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    const nextZoom = Math.min(4, Math.max(1, +(zoom + delta).toFixed(2)));
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(4, +(zoom + 0.5).toFixed(1));
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(1, +(zoom - 0.5).toFixed(1));
    setZoom(nextZoom);
    setPan((prev) => (nextZoom <= 1 ? { x: 0, y: 0 } : clampPan(prev.x, prev.y, nextZoom)));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCenterOnPlayer = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth || 0;
    const h = containerRef.current.clientHeight || 0;
    const targetZoom = Math.max(zoom, 2);
    setZoom(targetZoom);
    const targetPxX = (playerX / 100) * w;
    const targetPxY = (playerY / 100) * h;
    const targetPanX = w / 2 - targetPxX * targetZoom;
    const targetPanY = h / 2 - targetPxY * targetZoom;
    setPan(clampPan(targetPanX, targetPanY, targetZoom));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0c1017]/98 border border-yellow-400/40 shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(250,204,21,0.15)] overflow-hidden animate-scale-up"
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
              <Compass className="w-5 h-5 animate-spin-slow text-yellow-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                MINIMAP
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Close Radar (ESC or M)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* MODAL CONTENT: INTERACTIVE MAP CANVAS + DIRECTORY */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: INTERACTIVE ZOOMABLE & PANNABLE OVERWORLD MAP */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div
              ref={containerRef}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-full aspect-[7/5] rounded-xl overflow-hidden bg-[#06080d] border-2 border-yellow-400/30 shadow-inner flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none"
            >
              {/* Pannable & Zoomable Map Layer */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                  willChange: "transform",
                }}
                className="relative w-full h-full"
              >
                {/* Full Actual Biñan Bayan Overworld Map Image (1:1 3m Scale) */}
                <img
                  src="/assets/binan_bayan_3m.png"
                  alt="Biñan Bayan Overworld Map"
                  draggable={false}
                  onError={(e) => {
                    console.error("Failed to load /assets/binan_bayan_3m.png in minimap", e);
                  }}
                  className="w-full h-full object-fill [image-rendering:pixelated] pointer-events-none select-none"
                />

                {/* STATIC GUIDE NPCS ON MAP */}
                {npcList.map((npc) => {
                  const spriteUrl =
                    (npc.spriteId && SPRITE_MAP[npc.spriteId]) ||
                    `/assets/inventory_portraits/${getPortraitFileName(npc.spriteId)}`;
                  const isNearby = Math.hypot((npc.x ?? 0) - playerX, (npc.y ?? 0) - playerY) < 1.0;
                  const isTracked = trackedNpcId === npc.id;

                  return (
                    <div
                      key={npc.id}
                      style={{ left: `${npc.x ?? 0}%`, top: `${npc.y ?? 0}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTrackNpc) {
                          onTrackNpc(npc);
                        } else {
                          onSelectNpc?.(npc);
                        }
                        onClose?.();
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group z-20 hover:scale-125 transition-transform pointer-events-auto"
                      title={`Click to track direction to ${npc.name} (${npc.title})`}
                    >
                      {isTracked && (
                        <div className="absolute w-8 h-8 rounded-full border-2 border-yellow-300 animate-ping pointer-events-none" />
                      )}
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border-2 ${
                        isTracked ? "border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,1)] scale-110" : "border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                      } bg-black/90`}>
                        <img
                          src={spriteUrl}
                          alt={npc.name}
                          className="w-full h-full object-cover [image-rendering:pixelated]"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                          }}
                        />
                      </div>
                      <div className="mt-0.5 px-1.5 py-0.5 rounded bg-black/90 border border-yellow-400/60 text-[8px] sm:text-[9px] font-mono font-bold text-yellow-300 whitespace-nowrap shadow flex items-center space-x-1">
                        <span>{npc.name}</span>
                        {npc.title && <span className="text-gray-400 font-normal">({npc.title})</span>}
                        {isTracked && <span className="text-yellow-400 font-black">★</span>}
                        {isNearby && <span className="ml-1 text-emerald-400">●</span>}
                      </div>
                    </div>
                  );
                })}

                {/* PEER PLAYERS ON MAP */}
                {peerList.map((peer) => {
                  const spriteUrl =
                    (peer.avatarId && SPRITE_MAP[peer.avatarId]) ||
                    `/assets/inventory_portraits/${getPortraitFileName(peer.avatarId)}`;

                  return (
                    <div
                      key={peer.id}
                      style={{ left: `${peer.x ?? 0}%`, top: `${peer.y ?? 0}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-15 transition-all duration-150"
                    >
                      <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full overflow-hidden border border-cyan-400/90 shadow-[0_0_6px_rgba(34,211,238,0.7)] bg-cyan-950">
                        <img
                          src={spriteUrl}
                          alt={peer.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.onerror = null;
                            target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                          }}
                        />
                      </div>
                      <div className="mt-0.5 px-1 rounded bg-black/80 text-[7px] font-mono text-cyan-200 whitespace-nowrap">
                        @{peer.username}
                      </div>
                    </div>
                  );
                })}

                {/* LOCAL PLAYER ("YOU") ON MAP - SUBSTANTIALLY ENLARGED WITH HEADING ARROW */}
                <div
                  style={{ left: `${playerX}%`, top: `${playerY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-30 transition-all duration-75"
                >
                  {/* Outer Pulsing Beacon Wave */}
                  <div className="absolute w-12 h-12 rounded-full bg-yellow-400/30 animate-ping pointer-events-none" />

                  {/* Rotating Directional Arrow Container */}
                  <div
                    style={{ transform: `rotate(${playerHeadingDeg + 90}deg)` }}
                    className="absolute w-12 h-12 flex items-start justify-center pointer-events-none transition-transform duration-100"
                  >
                    {/* Bold Gold Arrow Pointing in Facing/Movement Direction */}
                    <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[14px] border-b-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,1)] -mt-2" />
                  </div>

                  {/* High-Visibility Avatar Ring */}
                  <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-white shadow-[0_0_16px_rgba(250,204,21,0.95)] bg-yellow-400 ring-2 ring-yellow-400/80 flex items-center justify-center z-10">
                    <img
                      src={
                        (localPlayer.avatarId && SPRITE_MAP[localPlayer.avatarId]) ||
                        `/assets/inventory_portraits/${getPortraitFileName(localPlayer.avatarId)}`
                      }
                      alt="You"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                      }}
                    />
                  </div>

                  {/* High-Contrast "YOU" Badge */}
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[9px] font-mono font-black tracking-widest uppercase whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.8)] border border-black/40 z-10">
                    YOU
                  </div>
                </div>
              </div>

              {/* Floating Zoom & Pan Controls on Top-Right of Map */}
              <div className="absolute top-2 right-2 z-40 flex flex-col space-y-1 bg-black/85 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-lg pointer-events-auto">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-yellow-400/20 hover:text-yellow-300 text-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-yellow-400/20 hover:text-yellow-300 text-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCenterOnPlayer}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-yellow-400/20 hover:text-yellow-300 text-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Center on You"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-yellow-400/20 hover:text-yellow-300 text-gray-200 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Reset View (1x)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Current Zoom & Pan Badge */}
              <div className="absolute bottom-2 left-2 z-40 px-2 py-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 text-[10px] font-mono text-gray-300 flex items-center space-x-2 pointer-events-none">
                <span className="text-yellow-400 font-bold">{Math.round(zoom * 100)}%</span>
                <span className="text-gray-500">•</span>
                <span>Drag to pan • Wheel to zoom</span>
              </div>
            </div>

          </div>

          {/* RIGHT: ONLINE ROVERS LIST (STREAMLINED) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-mono font-black uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Online Rovers ({onlineCount ?? 1}/10)</span>
              </h3>
              <span className="text-[10px] font-mono text-gray-400">Channel {currentLobbyId ?? 1}</span>
            </div>

            <div className="flex-1 max-h-[360px] sm:max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {/* Local player entry */}
              <div className="p-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-yellow-400/60 bg-black/60 flex-shrink-0">
                    <img
                      src={
                        (localPlayer.avatarId && SPRITE_MAP[localPlayer.avatarId]) ||
                        `/assets/inventory_portraits/${getPortraitFileName(localPlayer.avatarId)}`
                      }
                      alt="You"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                      }}
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-yellow-300">You</span>
                    <span className="text-[10px] font-mono text-gray-400 ml-1.5">({localPlayer.username})</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-300">
                  {Math.round(playerX)}%, {Math.round(playerY)}%
                </span>
              </div>

              {/* Peer players */}
              {peerList.length === 0 ? (
                <p className="text-[11px] font-mono text-gray-400 py-8 text-center">
                  No other Rovers in Channel {currentLobbyId ?? 1}.
                </p>
              ) : (
                peerList.map((peer) => {
                  const { direction, dist } = getRelativePosition(peer.x ?? 0, peer.y ?? 0);
                  const spriteUrl =
                    (peer.avatarId && SPRITE_MAP[peer.avatarId]) ||
                    `/assets/inventory_portraits/${getPortraitFileName(peer.avatarId)}`;
                  return (
                    <div
                      key={peer.id}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-cyan-400/50 bg-black/60 flex-shrink-0">
                          <img
                            src={spriteUrl}
                            alt={peer.username}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.onerror = null;
                              target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                            }}
                          />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                            <span className="text-gray-200 font-mono font-bold truncate">{peer.username}</span>
                          </div>
                          {peer.title && (
                            <span className="text-[9px] font-mono text-yellow-400/80 truncate block">
                              {peer.title}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 flex-shrink-0 ml-2">
                        {direction} • {dist}m
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-yellow-300 font-bold">M</kbd> or tap the Map button anytime to check radar.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export const PlazaMiniMapModal: React.FC<PlazaMiniMapModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <MiniMapErrorBoundary onClose={props.onClose}>
      <PlazaMiniMapModalContent {...props} />
    </MiniMapErrorBoundary>
  );
};
