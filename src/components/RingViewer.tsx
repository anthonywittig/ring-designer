import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, useEnvironment } from "@react-three/drei";
import ReplicadMesh from "./ReplicadMesh";
import Gem from "./Gem";
import type { MeshResult } from "../worker-api";
import { METALS, type RingParams } from "../params";

// CC0 studio HDRI from polyhaven.com lights the metal via the scene
// environment. The diamond deliberately uses its own high-contrast sparkle
// map (see Gem.tsx): photographed studios are mostly dark walls, which
// flatters metal but reads black through a refractive stone.
import hdrUrl from "../assets/studio_small_08_1k.hdr?url";

function Scene({
  result,
  params,
}: {
  result: MeshResult | null;
  params: RingParams;
}) {
  const envMap = useEnvironment({ files: hdrUrl });
  const metalColor = METALS[params.metal].color;

  return (
    <>
      <Environment map={envMap} />
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
    </>
  );
}

export default function RingViewer({
  result,
  params,
}: {
  result: MeshResult | null;
  params: RingParams;
}) {
  return (
    <Canvas
      frameloop="demand"
      dpr={Math.min(window.devicePixelRatio, 2)}
      camera={{ position: [14, 24, 36], fov: 32 }}
    >
      <color attach="background" args={["#f2f1ee"]} />
      <ambientLight intensity={0.3} />
      <OrbitControls makeDefault target={[0, 2, 0]} />
      <Suspense fallback={null}>
        <Scene result={result} params={params} />
      </Suspense>
    </Canvas>
  );
}
