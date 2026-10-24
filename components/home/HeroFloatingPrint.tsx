"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Homepage hero object: a twisted, lobed vase floating above a glowing emerald
// ring (the "print bed"), printing itself layer by layer in mid-air. A bright
// extruder point traces the layer being laid; when the print completes it
// turns for a few seconds, then re-prints in the next filament. Drag to spin.
//
// Loaded with next/dynamic (ssr: false). Pauses off-screen / in hidden tabs.
// prefers-reduced-motion → the finished vase, standing still.
//
// The live print status is reported through `onStatus` so the page can show
// it in its own UI (the frosted card in the hero).

export interface PrintStatus {
  layer: number;
  total: number;
  printing: boolean;
  filament: string;
}

export const FILAMENTS = [
  { name: "PLA · Emerald", color: 0x10b981 },
  { name: "PLA · Marble white", color: 0xe2e8f0 },
  { name: "PETG · Indigo", color: 0x6366f1 },
];
export const TOTAL_LAYERS = 1200;
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

// Soft radial glow sprite for halos (additive, so it reads as light).
function glowTexture(inner: string, outer: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Ring glow: bright thin band at radius ~0.8 fading in and out.
function ringTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, "rgba(16,185,129,0)");
  grad.addColorStop(0.62, "rgba(16,185,129,0.05)");
  grad.addColorStop(0.76, "rgba(110,231,183,0.55)");
  grad.addColorStop(0.8, "rgba(236,253,245,1)");
  grad.addColorStop(0.84, "rgba(110,231,183,0.5)");
  grad.addColorStop(1, "rgba(16,185,129,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      stage.dataset.fallback = "true";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "pan-y";
    stage.appendChild(renderer.domElement);

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

    const stripes = document.createElement("canvas");
    stripes.width = 4;
    stripes.height = 8;
    const sx = stripes.getContext("2d")!;
    sx.fillStyle = "#fff";
    sx.fillRect(0, 0, 4, 8);
    sx.fillStyle = "#555";
    sx.fillRect(0, 6, 4, 2);
    const bump = new THREE.CanvasTexture(stripes);
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

    // Drag to spin (horizontal only, so vertical swipes still scroll).
    let spin = 0;
    let spinVel = 0;
    let dragging = false;
    let lastX = 0;
    const el = renderer.domElement;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      spin += dx * 0.01;
      spinVel = dx * 0.01;
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

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
      const key = `${layer}:${printing}:${filament}`;
      if (key !== lastKey) {
        lastKey = key;
        statusRef.current?.({ layer, total: TOTAL_LAYERS, printing, filament: FILAMENTS[filament].name });
      }
    };

    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Slightly above, looking down at the ring; back off on narrow stages.
      const dist = w / h < 0.9 ? 24 : 19;
      camera.position.set(target.x, target.y + dist * 0.26, dist);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    let onScreen = true;
    let tabVisible = !document.hidden;
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
    });
    io.observe(stage);
    const onVis = () => {
      tabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!onScreen || !tabVisible) return;
      update(dt, clock.elapsedTime);
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
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
      renderer.domElement.remove();
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
