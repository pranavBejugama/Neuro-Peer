"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize = 3,
  showGradient = true,
  reverse = false,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TOTAL_SIZE = 20;
    const DOT = dotSize;

    // Build colour array matching original shader logic
    let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
    if (colors.length === 2)
      colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    else if (colors.length === 3)
      colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];

    // Deterministic pseudo-random (mirrors GLSL random)
    function random(x: number, y: number) {
      const PHI = 1.6180339887498948482;
      const d = Math.sqrt((x * PHI - x) ** 2 + (y * PHI - y) ** 2) * 0.5;
      return Math.abs(Math.tan(d) * x) % 1;
    }

    let startTime: number | null = null;

    function draw(ts: number) {
      if (!ctx || !canvas) return;
      if (startTime === null) startTime = ts;
      const elapsed = (ts - startTime) / 1000; // seconds

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const cols = Math.ceil(W / TOTAL_SIZE);
      const rows = Math.ceil(H / TOTAL_SIZE);
      const cx = cols / 2;
      const cy = rows / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      // Adjust speed to feel similar to original
      const speedFactor = animationSpeed * 0.035;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const r0 = random(col, row);
          const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);

          let timingOffset: number;
          if (reverse) {
            timingOffset = (maxDist - dist) * 0.02 + random(col + 42, row + 42) * 0.2;
          } else {
            timingOffset = dist * 0.01 + r0 * 0.15;
          }

          const t = elapsed * speedFactor;
          let opacity: number;
          if (reverse) {
            opacity = t < timingOffset ? 1 : 1 - Math.min(1, (t - timingOffset) / 0.1);
          } else {
            opacity = t < timingOffset ? 0 : Math.min(1, (t - timingOffset) / 0.1);
          }

          if (opacity <= 0) continue;

          // Pick opacity tier from the opacities array
          const randTier = random(col * 7.3, row * 3.7);
          const tierIdx = Math.floor(randTier * opacities.length) % opacities.length;
          const finalOpacity = opacity * opacities[tierIdx];

          // Pick colour
          const colorIdx = Math.floor(r0 * colorsArray.length) % colorsArray.length;
          const [r, g, b] = colorsArray[colorIdx];

          ctx.fillStyle = `rgba(${r},${g},${b},${finalOpacity})`;
          ctx.beginPath();
          ctx.arc(
            col * TOTAL_SIZE + DOT,
            row * TOTAL_SIZE + DOT,
            DOT / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    // Resize canvas to fill container
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      startTime = null; // restart animation on resize
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [animationSpeed, opacities, colors, dotSize, reverse]);

  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  );
};
