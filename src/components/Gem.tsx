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

  // Lightbox base: bright in EVERY direction (like a jewelry photo tent) so
  // the stone reads icy white from any camera angle. Contrast comes from
  // LIGHT-GREY bars, never black — the facets should read soft and gemmy.
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(0.5, "#eceef2");
  bg.addColorStop(1, "#d3d6dd");
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
  // Light-grey contrast bars around the equator and below: crisp facet
  // definition in light greys, not a black checkerboard. Feathered edges
  // (soft horizontal gradient) so facet lines read gemmy, not jagged.
  const softBar = (x: number, w: number, color: string) => {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "rgba(143,150,169,0)");
    g.addColorStop(0.35, color);
    g.addColorStop(0.65, color);
    g.addColorStop(1, "rgba(143,150,169,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 150, w, 260);
  };
  for (let i = 0; i < 10; i++) {
    softBar(14 + i * 102, 46, i % 2 ? "#a3a9b8" : "#8f96a9");
  }
  // Hot softboxes above and low fill strips between the bars.
  panel(80, 15, 240, 110);
  panel(430, 10, 260, 95);
  panel(780, 20, 190, 110);
  panel(240, 430, 160, 60);
  panel(620, 435, 170, 55);
  // Small cool accents for subtle blue/violet hints in the facets — one on
  // each side so slightly-rotated views still catch a hint.
  panel(500, 240, 48, 110, "#8fa0e8");
  panel(130, 250, 40, 100, "#9dabea");
  panel(840, 235, 36, 100, "#a4b0ec");

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
    // The key forces a remount when the stone changes: drei's
    // MeshRefractionMaterial builds its BVH once on mount and never rebuilds
    // it, so without this every stone refracts against the first stone's
    // facet cage (larger stones escape it entirely and render flat).
    <mesh
      key={`${cut}-${widthMM.toFixed(3)}-${lengthMM.toFixed(3)}`}
      geometry={geometry}
      position={position}
    >
      <MeshRefractionMaterial
        envMap={envMap}
        bounces={3}
        ior={2.42}
        fresnel={1}
        aberrationStrength={0.008}
        color="#ffffff"
        fastChroma
        toneMapped={false}
      />
    </mesh>
  );
}
