import React from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import ReplicadMesh from "./ReplicadMesh";
import Gem from "./Gem";
import type { MeshResult } from "../worker-api";
import { METALS, type RingParams } from "../params";

export default function RingViewer({
  result,
  params,
}: {
  result: MeshResult | null;
  params: RingParams;
}) {
  const metalColor = METALS[params.metal].color;

  return (
    <Canvas
      frameloop="demand"
      dpr={Math.min(window.devicePixelRatio, 2)}
      camera={{ position: [16, 10, 42], fov: 32 }}
    >
      <color attach="background" args={["#f2f1ee"]} />
      {result && (
        // Model space: band around Z, head along +X. Rotate head up (+Y).
        <group rotation={[0, 0, Math.PI / 2]}>
          <ReplicadMesh faces={result.faces} color={metalColor} />
          <Gem
            cut={params.cut}
            widthMM={result.info.stoneWidthMM}
            lengthMM={result.info.stoneLengthMM}
            position={[result.info.girdleX, 0, 0]}
          />
        </group>
      )}
      <OrbitControls makeDefault target={[0, 2, 0]} />
      <ambientLight intensity={0.5} />
      {/* Procedural studio environment - no network fetch. */}
      <Environment resolution={256}>
        {/* soft white room so white metals never reflect pure black */}
        <Lightformer intensity={0.9} scale={[120, 120, 1]} position={[0, 0, -50]} />
        <Lightformer intensity={0.9} scale={[120, 120, 1]} position={[0, 0, 50]} rotation={[0, Math.PI, 0]} />
        <Lightformer intensity={0.7} scale={[120, 120, 1]} position={[-50, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer intensity={0.7} scale={[120, 120, 1]} position={[50, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        {/* key + accent lights */}
        <Lightformer
          intensity={5}
          position={[0, 30, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[40, 40, 1]}
        />
        <Lightformer intensity={3} position={[-30, 10, 10]} scale={[12, 40, 1]} />
        <Lightformer intensity={3} position={[30, 10, -10]} scale={[12, 40, 1]} />
        <Lightformer intensity={2} position={[0, 5, 35]} scale={[30, 8, 1]} />
        <Lightformer intensity={1.2} color="#ffe9c9" position={[0, -20, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} />
      </Environment>
    </Canvas>
  );
}
