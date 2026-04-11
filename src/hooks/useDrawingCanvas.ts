import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number };

type Options = {
  color: string;
  lineWidth?: number;
};

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

export function useDrawingCanvas({ color, lineWidth = 5 }: Options) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const setSizePreservingContent = useCallback(
    (width: number, height: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const prev = document.createElement("canvas");
      prev.width = canvas.width;
      prev.height = canvas.height;
      const prevCtx = prev.getContext("2d");
      if (prevCtx) prevCtx.drawImage(canvas, 0, 0);

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      if (prev.width > 0 && prev.height > 0) {
        ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, canvas.width, canvas.height);
      }
    },
    [color, lineWidth]
  );

  const start = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      isDrawingRef.current = true;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      lastPointRef.current = getCanvasPoint(canvas, clientX, clientY);
    },
    [color, lineWidth]
  );

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const last = lastPointRef.current;
      const next = getCanvasPoint(canvas, clientX, clientY);
      if (!last) {
        lastPointRef.current = next;
        return;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      lastPointRef.current = next;
    },
    [color, lineWidth]
  );

  const end = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const bindPointerHandlers = useMemo(() => {
    return {
      onPointerDown: (e: ReactPointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start(e.clientX, e.clientY);
      },
      onPointerMove: (e: ReactPointerEvent) => move(e.clientX, e.clientY),
      onPointerUp: () => end(),
      onPointerCancel: () => end(),
      onPointerLeave: () => end()
    };
  }, [end, move, start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      setSizePreservingContent(Math.floor(box.width), Math.floor(box.height));
    });

    ro.observe(parent);
    return () => ro.disconnect();
  }, [setSizePreservingContent]);

  return {
    canvasRef,
    clear,
    bindPointerHandlers
  };
}
