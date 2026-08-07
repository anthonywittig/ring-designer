import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EquirectangularReflectionMapping } from "three";
import { RGBELoader } from "three-stdlib";
import ReplicadMesh from "./ReplicadMesh";
import Gem from "./Gem";
import type { MeshResult } from "../worker-api";
import { METALS, type RingParams } from "../params";

// CC0 studio HDRI from polyhaven.com lights the metal via the scene
// environment. The diamond deliberately uses its own high-contrast sparkle
// map (see Gem.tsx): photographed studios are mostly dark walls, which
// flatters metal but reads black through a refractive stone.
import hdrUrl from "../assets/studio_small_08_1k.hdr?url";

// Load the HDR imperatively instead of via drei's useEnvironment: the
// Suspense/useLoader path hung forever in production builds (no error, no
// resolution - blank canvas). This way the scene renders immediately, the
// environment pops in when ready, and failures actually log.
function StudioEnvironment() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    let disposed = false;
    new RGBELoader().load(
      hdrUrl,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.mapping = EquirectangularReflectionMapping;
        scene.environment = tex;
      },
      undefined,
      (err) => console.error("Failed to load studio HDR environment:", err),
    );
    return () => {
      disposed = true;
      scene.environment = null;
    };
  }, [scene]);
  return null;
}

export default function RingViewer({
  result,
  params,
}: {
  result: MeshResult | null;
  params: RingParams;
}) {
  const metalColor = METALS[params.metal].color;

  // Workaround for a production-build bug in @react-three/fiber v8: the
  // Canvas misses its initial size measurement (react-use-measure's first
  // ResizeObserver callback), so the WebGL root is never created and the
  // canvas stays blank until some interaction re-triggers measurement.
  // A synthetic resize event reliably kicks it. Dev builds are unaffected
  // (StrictMode's double-mount re-measures).
  useEffect(() => {
    const kicks = [50, 400].map((ms) =>
      setTimeout(() => window.dispatchEvent(new Event("resize")), ms),
    );
    return () => kicks.forEach(clearTimeout);
  }, []);

  return (
    // A continuous frameloop (the default): demand mode missed repaints when
    // async pieces (env texture, worker mesh) arrived, and the refraction
    // material updates per-frame uniforms anyway.
    <Canvas
      dpr={Math.min(window.devicePixelRatio, 2)}
      camera={{ position: [14, 24, 36], fov: 32 }}
      onCreated={(state) => {
        (window as any).__ringState = state;
      }}
    >
      <color attach="background" args={["#f2f1ee"]} />
      <ambientLight intensity={0.3} />
      <OrbitControls makeDefault target={[0, 2, 0]} />
      <StudioEnvironment />
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
    </Canvas>
  );
}
