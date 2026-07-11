import React, { useMemo } from "react";
import * as THREE from "three";
import { MeshRefractionMaterial } from "@react-three/drei";
import { ConvexGeometry } from "three-stdlib";
import type { StoneCut } from "../params";

// Display-only diamond (not part of the exported STL).
// Axis along +X (table up at +X), girdle outline in the YZ plane at x=0.
// Stone width runs along Y, length along Z, matching the head geometry.

// A cut diamond is convex, so we generate the characteristic vertex rings of
// the cut and take the convex hull - the facets fall out exactly.
function brilliantPoints(W: number, L: number): THREE.Vector3[] {
  const rY = W / 2;
  const rZ = L / 2;
  const h = (W + L) / 4; // height unit = average girdle radius
  const pts: THREE.Vector3[] = [];

  const ring = (n: number, scale: number, x: number, thetaOffset: number) => {
    for (let k = 0; k < n; k++) {
      const t = thetaOffset + (2 * Math.PI * k) / n;
      pts.push(
        new THREE.Vector3(x, rY * scale * Math.cos(t), rZ * scale * Math.sin(t)),
      );
    }
  };

  // Girdle: thin 32-gon band.
  ring(32, 1, 0, 0);
  ring(32, 1, -0.06 * h, 0);
  // Crown: bezel (kite) ring on the girdle mains, then the table octagon
  // rotated half a step - the hull forms kite + star facets between them.
  ring(8, 0.78, 0.2 * h, 0);
  ring(8, 0.57, 0.33 * h, Math.PI / 8);
  // Pavilion: main ring, then the culet point.
  ring(8, 0.55, -0.5 * h, 0);
  pts.push(new THREE.Vector3(-0.92 * h, 0, 0));

  return pts;
}

function princessPoints(W: number): THREE.Vector3[] {
  const r = W / 2;
  const pts: THREE.Vector3[] = [];
  const corners = (scale: number, x: number) => {
    for (const sy of [1, -1])
      for (const sz of [1, -1])
        pts.push(new THREE.Vector3(x, sy * r * scale, sz * r * scale));
  };
  // Girdle band, chamfered crown to the square table, pavilion chevron ring,
  // culet point.
  corners(1, 0);
  corners(1, -0.06 * r);
  corners(0.62, 0.3 * r);
  corners(0.5, -0.6 * r);
  pts.push(new THREE.Vector3(-1.3 * r, 0, 0));
  return pts;
}

// Procedural equirect studio env just for the diamond: high-contrast bright
// panels on a dark background make the facets sparkle. Offline, no HDR fetch.
let cachedEnv: THREE.Texture | null = null;
function studioEnvTexture(): THREE.Texture {
  if (cachedEnv) return cachedEnv;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Mid-bright studio base: light enough that the stone reads white, dark
  // enough that facets keep contrast.
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, "#c4c4cf");
  bg.addColorStop(0.45, "#8d8d97");
  bg.addColorStop(0.75, "#6a6a74");
  bg.addColorStop(1, "#4a4a54");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  const panel = (
    x: number,
    y: number,
    w: number,
    hgt: number,
    color = "#ffffff",
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, hgt);
  };
  // Hot softboxes for sparkle highlights, dark bars for facet contrast.
  panel(80, 20, 260, 110);
  panel(430, 10, 280, 90);
  panel(780, 30, 200, 110);
  panel(150, 200, 46, 200, "#1a1a20");
  panel(370, 180, 40, 220, "#22222a");
  panel(600, 200, 46, 200, "#1a1a20");
  panel(850, 190, 40, 210, "#22222a");
  panel(500, 250, 60, 120, "#ffe7c4");
  // Low fill panels so the pavilion stays lively from side views.
  panel(60, 400, 180, 70, "#e8e8f0");
  panel(700, 410, 200, 60, "#e8e8f0");

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedEnv = tex;
  return tex;
}

export default function Gem({
  cut,
  widthMM,
  lengthMM,
  position,
}: {
  cut: StoneCut;
  widthMM: number;
  lengthMM: number;
  position: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const pts =
      cut === "princess"
        ? princessPoints(widthMM)
        : brilliantPoints(widthMM, lengthMM);
    return new ConvexGeometry(pts);
  }, [cut, widthMM, lengthMM]);
  const envMap = useMemo(studioEnvTexture, []);

  return (
    <mesh geometry={geometry} position={position}>
      <MeshRefractionMaterial
        envMap={envMap}
        bounces={3}
        ior={2.42}
        fresnel={0.6}
        aberrationStrength={0.03}
        color="#ffffff"
        fastChroma
        toneMapped={false}
      />
    </mesh>
  );
}
