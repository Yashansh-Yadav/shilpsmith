"use client";

import { useEffect, useRef } from "react";

import type { PrintStatus } from "./heroPrintConfig";
import type { HeroSceneHandle } from "./heroScene";

// Host for the homepage hero 3D scene (see heroScene.ts): a vase floating
// above a glowing print-bed ring, printing itself layer by layer. Drag to spin.
//
// Performance: where the browser supports it (OffscreenCanvas + WebGL in a
// worker — current Chrome, Edge, Firefox, Safari 17+), three.js is loaded and
// run inside a Web Worker, so its ~350 KB of code and every frame of
// rendering stay off the main thread and never block scrolling, taps or the
// rest of the page. Elsewhere it falls back to running on the main thread.
// Either way it pauses off-screen / in hidden tabs, and under
// prefers-reduced-motion shows the finished vase standing still.
//
// The live print status is reported through `onStatus` so the page can show
// it in its own UI (the frosted card in the hero).

export type { PrintStatus };

export default function HeroFloatingPrint({
  onStatus,
  className = "",
}: {
  onStatus?: (s: PrintStatus) => void;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 1.5x on touch devices: ~44% fewer pixels per frame than 2x, and
    // indistinguishable on a phone-sized canvas.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const pixelRatio = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2);
    const emit = (s: PrintStatus) => statusRef.current?.(s);

    let disposed = false;
    let canvas: HTMLCanvasElement;
    // One driver interface for both modes.
    let send: {
      resize(w: number, h: number): void;
      down(x: number): void;
      move(x: number): void;
      up(): void;
      active(on: boolean): void;
      dispose(): void;
    } | null = null;

    const makeCanvas = () => {
      const c = document.createElement("canvas");
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.display = "block";
      c.style.touchAction = "pan-y"; // vertical swipes still scroll the page
      stage.prepend(c);
      return c;
    };

    const runOnMainThread = async () => {
      canvas?.remove();
      canvas = makeCanvas();
      attachPointer(canvas);
      try {
        const { createHeroScene } = await import("./heroScene");
        if (disposed) return;
        const scene: HeroSceneHandle = createHeroScene(
          canvas,
          { width: stage.clientWidth, height: stage.clientHeight, pixelRatio, reducedMotion },
          emit
        );
        send = {
          resize: (w, h) => scene.resize(w, h),
          down: (x) => scene.pointerDown(x),
          move: (x) => scene.pointerMove(x),
          up: () => scene.pointerUp(),
          active: (on) => scene.setActive(on),
          dispose: () => scene.dispose(),
        };
      } catch {
        stage.dataset.fallback = "true"; // no WebGL at all
      }
    };

    const runInWorker = () => {
      canvas = makeCanvas();
      attachPointer(canvas);
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new Worker(new URL("./heroScene.worker.ts", import.meta.url));
      worker.onmessage = (e: MessageEvent<{ type: string; status?: PrintStatus }>) => {
        if (e.data.type === "status" && e.data.status) emit(e.data.status);
        else if (e.data.type === "fallback") {
          worker.terminate();
          send = null;
          if (!disposed) void runOnMainThread();
        }
      };
      worker.onerror = () => {
        worker.terminate();
        send = null;
        if (!disposed) void runOnMainThread();
      };
      worker.postMessage(
        {
          type: "init",
          canvas: offscreen,
          width: stage.clientWidth,
          height: stage.clientHeight,
          pixelRatio,
          reducedMotion,
        },
        [offscreen]
      );
      send = {
        resize: (width, height) => worker.postMessage({ type: "resize", width, height }),
        down: (x) => worker.postMessage({ type: "down", x }),
        move: (x) => worker.postMessage({ type: "move", x }),
        up: () => worker.postMessage({ type: "up" }),
        active: (on) => worker.postMessage({ type: "active", on }),
        dispose: () => {
          worker.postMessage({ type: "dispose" });
          setTimeout(() => worker.terminate(), 200);
        },
      };
    };

    // Drag to spin (horizontal only, so vertical swipes still scroll).
    let dragging = false;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
      send?.down(e.clientX);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) send?.move(e.clientX);
    };
    const onUp = () => {
      dragging = false;
      send?.up();
    };
    function attachPointer(c: HTMLCanvasElement) {
      c.addEventListener("pointerdown", onDown);
      c.addEventListener("pointermove", onMove);
      c.addEventListener("pointerup", onUp);
      c.addEventListener("pointercancel", onUp);
    }

    const supportsWorker =
      typeof Worker !== "undefined" &&
      typeof OffscreenCanvas !== "undefined" &&
      "transferControlToOffscreen" in HTMLCanvasElement.prototype;
    if (supportsWorker) {
      try {
        runInWorker();
      } catch {
        void runOnMainThread();
      }
    } else {
      void runOnMainThread();
    }

    const ro = new ResizeObserver(() => send?.resize(stage.clientWidth, stage.clientHeight));
    ro.observe(stage);

    let onScreen = true;
    let tabVisible = !document.hidden;
    const sync = () => send?.active(onScreen && tabVisible);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    });
    io.observe(stage);
    const onVis = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      send?.dispose();
      canvas?.remove();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label="A 3D printed vase floating above a glowing print bed, printing itself layer by layer"
      className={`group/stage relative cursor-grab active:cursor-grabbing ${className}`}
      // Fade the canvas edges so the ring's glow never ends in a hard line.
      style={{
        maskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
      }}
    >
      <p className="absolute inset-0 hidden place-items-center font-mono text-sm text-slate-400 group-data-[fallback=true]/stage:grid">
        3D preview unavailable on this device
      </p>
    </div>
  );
}
