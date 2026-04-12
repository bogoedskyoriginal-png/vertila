import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { DrawingStroke, PredictionDrawing } from "../types/config";

type Point = { x: number; y: number };

export type DrawingTool = "pen" | "eraser";

type Options = {
  color: string;
  tool?: DrawingTool;
  lineWidth?: number;
  eraserWidth?: number;
  onStrokeComplete?: (stroke: DrawingStroke) => void;
};

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function getCanvasDpr(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 1;
  return Math.max(1, canvas.width / w);
}

function getNormalizedPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / Math.max(1, rect.width);
  const y = (clientY - rect.top) / Math.max(1, rect.height);
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

export function useDrawingCanvas({
  color,
  tool = "pen",
  lineWidth = 5,
  eraserWidth = 28,
  onStrokeComplete
}: Options) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const pointsPxRef = useRef<Point[]>([]);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  const applyStrokeStyle = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const dpr = getCanvasDpr(ctx.canvas);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Stroke rendering is independent from image smoothing, but keeping it enabled
      // helps when we later draw images onto the same canvas.
      ctx.imageSmoothingEnabled = true;
      // @ts-expect-error - older lib.dom.d.ts may not include this
      ctx.imageSmoothingQuality = "high";
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        // lineWidth is in CSS pixels -> convert to canvas pixels
        ctx.lineWidth = eraserWidth * dpr;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        // lineWidth is in CSS pixels -> convert to canvas pixels
        ctx.lineWidth = lineWidth * dpr;
      }
    },
    [color, eraserWidth, lineWidth, tool]
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    // @ts-expect-error - older lib.dom.d.ts may not include this
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const exportDataUrl = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }, []);

  const drawStrokes = useCallback(
    async (drawing: PredictionDrawing, opts?: { clear?: boolean; fit?: "contain" | "cover" }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (opts?.clear !== false) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      // @ts-expect-error - older lib.dom.d.ts may not include this
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const dpr = getCanvasDpr(canvas);
    const strokes = Array.isArray(drawing?.strokes) ? drawing.strokes : [];
    const aspect =
      typeof drawing?.aspect === "number" && Number.isFinite(drawing.aspect) && drawing.aspect > 0.1
        ? drawing.aspect
        : canvas.width / Math.max(1, canvas.height);

    const canvasAspect = canvas.width / Math.max(1, canvas.height);
    let targetW = canvas.width;
    let targetH = canvas.height;
    let offX = 0;
    let offY = 0;
    const fit = opts?.fit ?? "contain";
    if (fit === "cover") {
      if (canvasAspect > aspect) {
        targetW = canvas.width;
        targetH = targetW / aspect;
        offY = (canvas.height - targetH) / 2;
      } else {
        targetH = canvas.height;
        targetW = targetH * aspect;
        offX = (canvas.width - targetW) / 2;
      }
    } else {
      if (canvasAspect > aspect) {
        targetH = canvas.height;
        targetW = targetH * aspect;
        offX = (canvas.width - targetW) / 2;
      } else {
        targetW = canvas.width;
        targetH = targetW / aspect;
        offY = (canvas.height - targetH) / 2;
      }
    }

    for (const s of strokes) {
      const pts = Array.isArray(s?.points) ? s.points : [];
      if (pts.length < 2) continue;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.imageSmoothingEnabled = true;
      // @ts-expect-error - older lib.dom.d.ts may not include this
      ctx.imageSmoothingQuality = "high";
      if (s.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = Math.max(1, Number(s.width || 0)) * dpr;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = String(s.color || "#111827");
        ctx.lineWidth = Math.max(1, Number(s.width || 0)) * dpr;
      }

      ctx.beginPath();
      ctx.moveTo(offX + pts[0].x * targetW, offY + pts[0].y * targetH);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(offX + pts[i].x * targetW, offY + pts[i].y * targetH);
      }
      ctx.stroke();
    }
    },
    []
  );

  const drawFromDataUrl = useCallback(async (dataUrl: string, opts?: { clear?: boolean }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = dataUrl;
    }).catch(() => undefined);

    if (!img.width || !img.height) return;

    if (opts?.clear !== false) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      // @ts-expect-error - older lib.dom.d.ts may not include this
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingEnabled = true;
    // @ts-expect-error - older lib.dom.d.ts may not include this
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, x, y, w, h);
  }, []);

  const setSizePreservingContent = useCallback((width: number, height: number) => {
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
    // Keep CSS sizing driven by layout (e.g. width/height: 100%). Setting inline
    // px sizes here can fight flex/aspect-ratio layouts and cause stretch artifacts.

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.imageSmoothingEnabled = true;
    // @ts-expect-error - older lib.dom.d.ts may not include this
    ctx.imageSmoothingQuality = "high";

    if (prev.width > 0 && prev.height > 0) {
      ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, canvas.width, canvas.height);
    }
  }, []);

  const start = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      isDrawingRef.current = true;
      applyStrokeStyle(ctx);
      const p = getCanvasPoint(canvas, clientX, clientY);
      lastPointRef.current = p;
      pointsPxRef.current = [p];

      const widthCss = tool === "eraser" ? eraserWidth : lineWidth;
      currentStrokeRef.current = {
        tool,
        color,
        width: widthCss,
        points: [getNormalizedPoint(canvas, clientX, clientY)]
      };
    },
    [applyStrokeStyle, color, eraserWidth, lineWidth, tool]
  );

  const move = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const next = getCanvasPoint(canvas, clientX, clientY);

      applyStrokeStyle(ctx);
      const pts = pointsPxRef.current;
      pts.push(next);
      lastPointRef.current = next;

      // Simple smoothing: draw quadratic curves between midpoints.
      // This reduces jagged/pixelated vertical lines on lower event rates.
      if (pts.length === 2) {
        const a = pts[0];
        const b = pts[1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      } else if (pts.length >= 3) {
        const p1 = pts[pts.length - 3];
        const p2 = pts[pts.length - 2];
        const p3 = pts[pts.length - 1];
        const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p2.x, p2.y, mid2.x, mid2.y);
        ctx.stroke();
      }

      const st = currentStrokeRef.current;
      if (st) {
        const p = getNormalizedPoint(canvas, clientX, clientY);
        const lastP = st.points[st.points.length - 1];
        const dx = p.x - lastP.x;
        const dy = p.y - lastP.y;
        if (dx * dx + dy * dy > 0.000002) st.points.push(p);
      }
    },
    [applyStrokeStyle]
  );

  const end = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pointsPxRef.current = [];
    const st = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (st && st.points.length >= 2) onStrokeComplete?.(st);
  }, [onStrokeComplete]);

  const bindPointerHandlers = useMemo(() => {
    return {
      onPointerDown: (e: ReactPointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start(e.clientX, e.clientY);
      },
      onPointerMove: (e: ReactPointerEvent) => move(e.clientX, e.clientY),
      onPointerUp: (e: ReactPointerEvent) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        end();
      },
      onPointerCancel: (e: ReactPointerEvent) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        end();
      },
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
    exportDataUrl,
    drawStrokes,
    drawFromDataUrl,
    bindPointerHandlers
  };
}
