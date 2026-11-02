import * as THREE from "three";

import { FILAMENTS, TOTAL_LAYERS, type PrintStatus } from "./heroPrintConfig";

// The homepage hero scene: a twisted, lobed vase floating above a glowing
// emerald ring (the "print bed"), printing itself layer by layer in mid-air.
// A bright extruder point traces the layer being laid; when the print
// completes it turns for a few seconds, then re-prints in the next filament.
//
// DOM-free on purpose: it only touches the canvas it's given (HTMLCanvasElement
// or OffscreenCanvas), so the same code runs inside a Web Worker (preferred —
// three.js then never blocks the page's main thread) or on the main thread as
// a fallback. See HeroFloatingPrint.tsx / heroScene.worker.ts.

export interface HeroSceneOptions {
  width: number;
  height: number;
  pixelRatio: number;
  reducedMotion: boolean;
}

export interface HeroSceneHandle {
  resize(width: number, height: number): void;
  pointerDown(x: number): void;
  pointerMove(x: number): void;
  pointerUp(): void;
  /** Pause when off-screen or the tab is hidden. */
  setActive(active: boolean): void;
  dispose(): void;
}

const PRINT_SECONDS = 12;
const HOLD_SECONDS = 5;

const VH = 6.4; // printed height
const LOBES = 7;
const TWIST = 2.6;
function radiusAt(theta: number, t: number) {
  const profile =
    1.15 +
    0.9 * Math.sin(Math.PI * (t * 0.92 + 0.08)) -
    0.32 * Math.max(0, t - 0.82) * 4;
  return profile * (1 + 0.075 * Math.cos(LOBES * theta + TWIST * t * Math.PI));
}

function vaseGeometry() {
  const SEG = 180;
  const ROWS = 220;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= ROWS; j++) {
    const t = j / ROWS;
    for (let i = 0; i <= SEG; i++) {
      const th = (i / SEG) * Math.PI * 2;
      const r = radiusAt(th, t);
      pos.push(Math.cos(th) * r, t * VH, Math.sin(th) * r);
      uv.push(i / SEG, t);
    }
  }
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < SEG; i++) {
      const a = j * (SEG + 1) + i;
      const b = a + SEG + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 2D scratch canvas for procedural textures — OffscreenCanvas when available
// (always, inside a worker), a DOM canvas otherwise.
function scratch(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function ctx2d(c: HTMLCanvasElement | OffscreenCanvas) {
  return c.getContext("2d") as CanvasRenderingContext2D;
}
function canvasTexture(c: HTMLCanvasElement | OffscreenCanvas) {
  // CanvasTexture accepts OffscreenCanvas at runtime; its typings predate it.
  const t = new THREE.CanvasTexture(c as HTMLCanvasElement);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft radial glow sprite for halos (additive, so it reads as light).
function glowTexture(inner: string, outer: string) {
  const c = scratch(256, 256);
  const g = ctx2d(c);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return canvasTexture(c);
}

// Ring glow: bright thin band at radius ~0.8 fading in and out.
function ringTexture() {
  const c = scratch(512, 512);
  const g = ctx2d(c);
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, "rgba(16,185,129,0)");
  grad.addColorStop(0.62, "rgba(16,185,129,0.05)");
  grad.addColorStop(0.76, "rgba(110,231,183,0.55)");
  grad.addColorStop(0.8, "rgba(236,253,245,1)");
  grad.addColorStop(0.84, "rgba(110,231,183,0.5)");
  grad.addColorStop(1, "rgba(16,185,129,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  return canvasTexture(c);
}

// rAF exists in dedicated workers in current browsers; fall back to a timer.
const raf: (cb: (t: number) => void) => number =
  typeof self !== "undefined" && typeof self.requestAnimationFrame === "function"
    ? (cb) => self.requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
const caf: (id: number) => void =
  typeof self !== "undefined" && typeof self.cancelAnimationFrame === "function"
    ? (id) => self.cancelAnimationFrame(id)
    : (id) => clearTimeout(id);

/** Throws if WebGL is unavailable on this canvas. */
export function createHeroScene(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  opts: HeroSceneOptions,
  onStatus: (s: PrintStatus) => void
): HeroSceneHandle {
  const reduce = opts.reducedMotion;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas as HTMLCanvasElement,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(opts.pixelRatio);
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const target = new THREE.Vector3(0, 2.2, 0);

  // Light: soft key, indigo rim, emerald light rising off the ring.
  scene.add(new THREE.HemisphereLight(0xe2e8f0, 0x022c22, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(6, 10, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xecfdf5, 1.2);
  fill.position.set(-2, 3, 10);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x818cf8, 1.6);
  rim.position.set(-8, 5, -6);
  scene.add(rim);
  const ringLight = new THREE.PointLight(0x6ee7b7, 70, 12, 1.6);
  ringLight.position.set(0, -0.6, 0);
  scene.add(ringLight);

  // The glowing ring + floor halo.
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 8.4), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.4;
  scene.add(ring);
  const haloMat = new THREE.MeshBasicMaterial({
    map: glowTexture("rgba(52,211,153,0.55)", "rgba(16,185,129,0)"),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -1.38;
  scene.add(halo);

  // The floating part. `rig` bobs and tilts; `part` spins inside it.
  const rig = new THREE.Group();
  scene.add(rig);
  rig.rotation.set(0.12, 0, -0.16);

  const stripes = scratch(4, 8);
  const sx = ctx2d(stripes);
  sx.fillStyle = "#fff";
  sx.fillRect(0, 0, 4, 8);
  sx.fillStyle = "#555";
  sx.fillRect(0, 6, 4, 2);
  const bump = new THREE.CanvasTexture(stripes as HTMLCanvasElement);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(1, 140);

  const clip = new THREE.Plane();
  const localClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const partMat = new THREE.MeshPhysicalMaterial({
    color: FILAMENTS[0].color,
    roughness: 0.38,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    sheen: 0.4,
    bumpMap: bump,
    bumpScale: 0.7,
    side: THREE.DoubleSide,
    clippingPlanes: [clip],
  });
  const part = new THREE.Mesh(vaseGeometry(), partMat);
  part.position.y = -0.7; // base floats just above the ring (y = -1.4)
  rig.add(part);

  // Layer being laid + the extruder point tracing it (children of the part,
  // so they follow its spin and tilt).
  const LOOP = 180;
  const loopGeo = new THREE.BufferGeometry();
  loopGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array((LOOP + 1) * 3), 3));
  const loop = new THREE.Line(
    loopGeo,
    new THREE.LineBasicMaterial({ color: 0xa7f3d0, transparent: true, opacity: 0.9 })
  );
  part.add(loop);
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xecfdf5 })
  );
  part.add(tip);
  const tipGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture("rgba(167,243,208,1)", "rgba(16,185,129,0)"),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  tipGlow.scale.set(0.9, 0.9, 1);
  tip.add(tipGlow);
  const tipLight = new THREE.PointLight(0x6ee7b7, 5, 3, 2);
  tip.add(tipLight);

  const setLoop = (h: number) => {
    const t = h / VH;
    const p = loopGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= LOOP; i++) {
      const th = (i / LOOP) * Math.PI * 2;
      const r = radiusAt(th, t) + 0.01;
      p.setXYZ(i, Math.cos(th) * r, h + 0.01, Math.sin(th) * r);
    }
    p.needsUpdate = true;
  };

  // Drag to spin (horizontal only — the caller forwards clientX).
  let spin = 0;
  let spinVel = 0;
  let dragging = false;
  let lastX = 0;

  // Print cycle
  let tPrint = reduce ? PRINT_SECONDS : 0;
  let filament = 0;
  let lastKey = "";
  const update = (dt: number, elapsed: number) => {
    if (!reduce) tPrint += dt;
    if (tPrint >= PRINT_SECONDS + HOLD_SECONDS) {
      tPrint = 0;
      filament = (filament + 1) % FILAMENTS.length;
      partMat.color.setHex(FILAMENTS[filament].color);
    }
    const p = Math.min(tPrint / PRINT_SECONDS, 1);
    const printing = p < 1;
    const h = p * VH;

    // Float + spin
    if (!reduce) {
      rig.position.y = Math.sin(elapsed * 1.1) * 0.18;
      if (!dragging) {
        spinVel *= 0.95;
        spin += spinVel + dt * 0.35;
      }
    }
    part.rotation.y = spin;
    ring.material.opacity = 0.85 + Math.sin(elapsed * 1.1) * 0.15;

    // World-space clip plane from the part's local "keep y <= h" plane.
    part.updateMatrixWorld();
    localClip.constant = printing ? h : VH + 1;
    clip.copy(localClip).applyMatrix4(part.matrixWorld);

    loop.visible = tip.visible = printing;
    if (printing) {
      setLoop(h);
      const a = elapsed * 7;
      const r = radiusAt(a, h / VH);
      tip.position.set(Math.cos(a) * r, h + 0.02, Math.sin(a) * r);
    }

    // Report on layer OR state change (the last layer and "complete" can
    // share a rounded layer number).
    const layer = Math.round(p * TOTAL_LAYERS);
    const statusKey = `${layer}:${printing}:${filament}`;
    if (statusKey !== lastKey) {
      lastKey = statusKey;
      onStatus({ layer, total: TOTAL_LAYERS, printing, filament: FILAMENTS[filament].name });
    }
  };

  const resize = (w: number, h: number) => {
    if (!w || !h) return;
    // updateStyle=false: an OffscreenCanvas has no style, and on the main
    // thread the canvas is sized by CSS (100% of the stage).
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Slightly above, looking down at the ring; back off on narrow stages.
    const dist = w / h < 0.9 ? 24 : 19;
    camera.position.set(target.x, target.y + dist * 0.26, dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };
  resize(opts.width, opts.height);

  let active = true;
  let frame = 0;
  let last = performance.now();
  let elapsed = 0;
  const tick = (now: number) => {
    frame = raf(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!active) return;
    elapsed += dt;
    update(dt, elapsed);
    renderer.render(scene, camera);
  };
  frame = raf(tick);

  return {
    resize,
    pointerDown(x) {
      dragging = true;
      lastX = x;
    },
    pointerMove(x) {
      if (!dragging) return;
      const dx = x - lastX;
      lastX = x;
      spin += dx * 0.01;
      spinVel = dx * 0.01;
    },
    pointerUp() {
      dragging = false;
    },
    setActive(on) {
      active = on;
      last = performance.now();
    },
    dispose() {
      caf(frame);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as (THREE.Material & { map?: THREE.Texture | null }) | undefined;
        if (mat && !Array.isArray(mat)) {
          mat.map?.dispose();
          mat.dispose();
        }
      });
      bump.dispose();
      renderer.dispose();
    },
  };
}
