import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import {
  CanvasTexture,
  EquirectangularReflectionMapping,
  SRGBColorSpace,
} from "three";
import ReplicadMesh from "./ReplicadMesh";
import Gem from "./Gem";
import type { MeshResult } from "../worker-api";
import { METALS, type RingParams } from "../params";

// Procedural "giant softbox" studio: white ceiling, pale grey walls, mild
// warm floor bounce, plus a few huge feathered white panels. Replaces the
// photographed HDR whose dark walls printed harsh near-black bands on the
// metal. three r169 auto-PMREMs any equirect scene.environment texture, so a
// plain CanvasTexture needs no manual PMREM and no Suspense (drei's
// useEnvironment/<Environment> hang in production builds and stay banned).
// Module-cached so remounts reuse the same GPU texture.
let cachedSoftboxEnv: CanvasTexture | null = null;
function softboxEnvTexture(): CanvasTexture {
  if (cachedSoftboxEnv) return cachedSoftboxEnv;
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Base: pale-grey ceiling -> mid-grey walls -> warm floor tone. The walls
  // sit a clear step below the white softbox panels so the panels survive
  // the PMREM blur as broad highlights; nothing goes darker than warm
  // mid-grey, so no harsh dark reflection bands either.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.0, "#d8d9de");
  base.addColorStop(0.4, "#c6c7cd");
  base.addColorStop(0.62, "#b4b6bd");
  base.addColorStop(0.82, "#a89f8e"); // warm floor bounce for the gold mids
  base.addColorStop(1.0, "#948a77");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Huge feathered ellipse of light, drawn at x, x-W and x+W so the
  // equirect seam stays continuous.
  const softbox = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    alpha = 1,
    rgb = "255,255,255",
  ) => {
    for (const x of [cx, cx - W, cx + W]) {
      if (x + rx < 0 || x - rx > W) continue;
      ctx.save();
      ctx.translate(x, cy);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${rgb},${alpha})`);
      g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.65})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  };

  // Two overhead softboxes (broad top highlights on the band).
  softbox(230, 85, 280, 120);
  softbox(730, 75, 320, 130);
  // Equator-height side sweeps: the long soft white highlights that sweep
  // along the band sides, spaced around the ring so every azimuth catches
  // at least one.
  softbox(60, 245, 240, 170, 1);
  softbox(560, 255, 300, 185, 0.95);
  softbox(910, 250, 220, 160, 0.9);
  // Low warm fill so inner surfaces shade warm, not grey.
  softbox(400, 430, 320, 100, 0.5, "255,240,221");

  const tex = new CanvasTexture(canvas);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  cachedSoftboxEnv = tex;
  return tex;
}

function StudioEnvironment() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.environment = softboxEnvTexture();
    return () => {
      scene.environment = null; // texture is module-cached; just detach
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
    // The canvas stays transparent so the CSS backdrop gradient
    // (.canvas-wrap) shows through as the white->grey studio sweep.
    <Canvas
      dpr={Math.min(window.devicePixelRatio, 2)}
      // Framed so even a 3ct head stays in view on load.
      camera={{ position: [16, 26, 42], fov: 32 }}
      onCreated={(state) => {
        (window as any).__ringState = state;
      }}
    >
      <ambientLight intensity={0.15} />
      {/* The softbox env does most of the lighting; the directional is the
          one crisp accent highlight. */}
      <directionalLight position={[6, 14, 8]} intensity={0.65} />
      <OrbitControls
        makeDefault
        target={[0, 2, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={12}
        maxDistance={90}
        maxPolarAngle={Math.PI * 0.55}
      />
      <StudioEnvironment />
      {result && (
        <>
          {/* Model space: band around Z, head along +X. Rotate head up (+Y). */}
          <group rotation={[0, 0, Math.PI / 2]}>
            <ReplicadMesh faces={result.faces} color={metalColor} />
            <Gem
              cut={params.cut}
              widthMM={result.info.stoneWidthMM}
              lengthMM={result.info.stoneLengthMM}
              position={[result.info.girdleX, 0, 0]}
            />
          </group>
          {/* Soft shadow under the lowest point of the band grounds the
              ring on the backdrop without going sooty. */}
          <ContactShadows
            position={[0, -result.info.bandOuterRadiusMM - 0.01, 0]}
            opacity={0.26}
            scale={46}
            blur={3.2}
            far={result.info.bandOuterRadiusMM * 2.2}
            resolution={512}
            color="#6f675a"
          />
        </>
      )}
    </Canvas>
  );
}
