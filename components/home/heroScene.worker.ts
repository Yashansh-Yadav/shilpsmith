// Runs the hero 3D scene off the main thread: the page hands over its canvas
// (OffscreenCanvas) and forwards size / pointer / visibility; the worker
// renders and posts the live print status back. If WebGL isn't available in
// a worker on this browser, it replies "fallback" and the page runs the scene
// on the main thread instead.

import { createHeroScene, type HeroSceneHandle, type HeroSceneOptions } from "./heroScene";

type InMsg =
  | ({ type: "init"; canvas: OffscreenCanvas } & HeroSceneOptions)
  | { type: "resize"; width: number; height: number }
  | { type: "down"; x: number }
  | { type: "move"; x: number }
  | { type: "up" }
  | { type: "active"; on: boolean }
  | { type: "dispose" };

let scene: HeroSceneHandle | null = null;

self.onmessage = (e: MessageEvent<InMsg>) => {
  const m = e.data;
  switch (m.type) {
    case "init":
      try {
        scene = createHeroScene(m.canvas, m, (status) => self.postMessage({ type: "status", status }));
      } catch {
        self.postMessage({ type: "fallback" });
      }
      break;
    case "resize":
      scene?.resize(m.width, m.height);
      break;
    case "down":
      scene?.pointerDown(m.x);
      break;
    case "move":
      scene?.pointerMove(m.x);
      break;
    case "up":
      scene?.pointerUp();
      break;
    case "active":
      scene?.setActive(m.on);
      break;
    case "dispose":
      scene?.dispose();
      scene = null;
      self.close();
      break;
  }
};
