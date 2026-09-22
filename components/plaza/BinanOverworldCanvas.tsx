"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import {
  BINAN_GRID_COLS,
  BINAN_GRID_ROWS,
  BINAN_TILE_SIZE,
  BINAN_WORLD_WIDTH,
  BINAN_WORLD_HEIGHT,
} from "@/lib/plaza/binanMapData";

export interface BinanOverworldCanvasHandle {
  render: (camX: number, camY: number, zoom?: number) => void;
}

interface BinanOverworldCanvasProps {
  viewportWidth: number;
  viewportHeight: number;
}

export const BinanOverworldCanvas = forwardRef<
  BinanOverworldCanvasHandle,
  BinanOverworldCanvasProps
>(({ viewportWidth, viewportHeight }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef<boolean>(false);
  const lastCamRef = useRef<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 0.25 });

  const drawFrame = (camX: number, camY: number, zoom: number = 0.25) => {
    lastCamRef.current = { x: camX, y: camY, zoom };
    const canvas = canvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imgRef.current;
    if (!img || !imgLoadedRef.current || !img.complete || img.naturalWidth <= 0) return;

    const z = Math.max(0.05, zoom || 0.25);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(z, z);
    ctx.translate(camX, camY);
    ctx.drawImage(img, 0, 0, BINAN_WORLD_WIDTH, BINAN_WORLD_HEIGHT);
    ctx.restore();
  };

  useImperativeHandle(
    ref,
    () => ({
      render: (camX: number, camY: number, zoom?: number) => {
        drawFrame(camX, camY, zoom ?? 0.25);
      },
    }),
    []
  );

  useEffect(() => {
    const img = new Image();
    img.src = "/assets/binan_bayan_3m.png";
    img.onload = () => {
      imgLoadedRef.current = true;
      drawFrame(lastCamRef.current.x, lastCamRef.current.y);
    };
    imgRef.current = img;
  }, []);

  // Update canvas dimensions when viewport changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    drawFrame(lastCamRef.current.x, lastCamRef.current.y);
  }, [viewportWidth, viewportHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={viewportWidth}
      height={viewportHeight}
      style={{
        imageRendering: "pixelated",
      }}
      className="absolute inset-0 pointer-events-none"
    />
  );
});

BinanOverworldCanvas.displayName = "BinanOverworldCanvas";
