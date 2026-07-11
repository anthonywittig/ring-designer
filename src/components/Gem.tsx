import React, { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import type { StoneCut } from "../params";

// Display-only faceted gem (not part of the exported STL).
// Axis along +X (table up at +X), girdle outline in the YZ plane at x=0.
// Stone width runs along Y, length along Z, matching the head geometry.
function gemGeometry(cut: StoneCut, W: number, L: number): BufferGeometry {
  const isPrincess = cut === "princess";
  const N = isPrincess ? 4 : 16;
  const thetaOffset = isPrincess ? Math.PI / 4 : 0;
  // Radii so that a princess girdle's corners land at (±W/2, ±W/2).
  const rY = isPrincess ? (W / 2) * Math.SQRT2 : W / 2;
  const rZ = isPrincess ? (W / 2) * Math.SQRT2 : L / 2;

  const avg = (W + L) / 2;
  const crownH = 0.16 * avg;
  const pavilionD = 0.44 * avg;
  const tableScale = 0.58;

  const ringPoint = (k: number, scale: number, x: number) => {
    const theta = thetaOffset + (2 * Math.PI * k) / N;
    return [x, rY * scale * Math.cos(theta), rZ * scale * Math.sin(theta)];
  };

  const positions: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) =>
    positions.push(...a, ...b, ...c);

  const apex = [-pavilionD, 0, 0];
  const tableCenter = [crownH, 0, 0];
  for (let k = 0; k < N; k++) {
    const g0 = ringPoint(k, 1, 0);
    const g1 = ringPoint(k + 1, 1, 0);
    const t0 = ringPoint(k, tableScale, crownH);
    const t1 = ringPoint(k + 1, tableScale, crownH);
    // crown side
    tri(g0, g1, t1);
    tri(g0, t1, t0);
    // table
    tri(t0, t1, tableCenter);
    // pavilion
    tri(g1, g0, apex);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
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
  const geometry = useMemo(
    () => gemGeometry(cut, widthMM, lengthMM),
    [cut, widthMM, lengthMM],
  );

  return (
    <mesh geometry={geometry} position={position}>
      <meshPhysicalMaterial
        color="#eef4ff"
        metalness={0}
        roughness={0.03}
        transmission={0.7}
        ior={2.4}
        thickness={3}
        clearcoat={1}
        envMapIntensity={2.2}
        flatShading
        side={DoubleSide}
      />
    </mesh>
  );
}
