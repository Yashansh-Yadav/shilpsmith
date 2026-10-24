"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

interface Props {
  url: string;
  height?: number;
}

export default function ThreeDViewer({ url, height = 360 }: Props) {
  return (
    <div
      className="overflow-hidden rounded-[1.5rem] bg-slate-950"
      style={{ height }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Stage intensity={0.5} environment="city">
            <Model url={url} />
          </Stage>
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={1}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}
