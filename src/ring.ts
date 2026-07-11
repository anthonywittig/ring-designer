import {
  draw,
  drawCircle,
  makeCylinder,
  makeSphere,
  measureVolume,
} from "replicad";
import type { Shape3D } from "replicad";
import { innerDiameterMM, stoneDims, type RingParams } from "./params";

// All dimensions in millimeters.
// Coordinate system: Z = finger axis (band revolves around it), head points +X.

const BAND_THICKNESS = 1.65; // radial
const COMFORT_DOME = 0.35; // inner-surface bulge of a comfort-fit band

export interface RingGeometryInfo {
  girdleX: number; // radial position of the stone's girdle plane
  stoneWidthMM: number; // across the band (Y)
  stoneLengthMM: number; // along the finger (Z)
  volumeMM3: number;
}

function bandProfile(params: RingParams, Ri: number, Ro: number) {
  const w = params.bandWidthMM;
  const c = params.fit === "comfort" ? COMFORT_DOME : 0;

  if (params.profile === "round") {
    // Inner surface (flat, or domed for comfort fit), outer half-round arc.
    if (c > 0) {
      return draw([Ri + c, -w / 2])
        .threePointsArcTo([Ri + c, w / 2], [Ri, 0])
        .threePointsArcTo([Ri + c, -w / 2], [Ro, 0])
        .close();
    }
    return draw([Ri, -w / 2])
      .lineTo([Ri, w / 2])
      .threePointsArcTo([Ri, -w / 2], [Ro, 0])
      .close();
  }

  // Square profile.
  if (c > 0) {
    return draw([Ri + c, -w / 2])
      .threePointsArcTo([Ri + c, w / 2], [Ri, 0])
      .lineTo([Ro, w / 2])
      .lineTo([Ro, -w / 2])
      .close();
  }
  return draw([Ri, -w / 2])
    .lineTo([Ri, w / 2])
    .lineTo([Ro, w / 2])
    .lineTo([Ro, -w / 2])
    .close();
}

export function buildRing(params: RingParams): {
  shape: Shape3D;
  info: RingGeometryInfo;
} {
  const Ri = innerDiameterMM(params.ringSizeUS) / 2;
  const Ro = Ri + BAND_THICKNESS;
  const w = params.bandWidthMM;

  const band = bandProfile(params, Ri, Ro)
    .sketchOnPlane("XZ")
    .revolve() as Shape3D;

  // --- Head: 4 claw prongs + gallery rail, sized from the stone ---
  const { widthMM: W, lengthMM: L } = stoneDims(params.cut, params.carat);
  const girdleX = Ro + 1.2 + 0.15 * W;
  const tipX = girdleX + 1.0;
  const prongR = Math.min(0.65, Math.max(0.42, 0.32 + 0.035 * W));

  // Prong tip position on the girdle outline. Round/oval prongs sit at the
  // 45-degree points of the (elliptical) girdle; princess prongs hug the
  // square's corners. Same diagonal layout either way.
  const diag = Math.SQRT1_2;
  let yTip: number;
  let zTip: number;
  if (params.cut === "princess") {
    yTip = W / 2 + prongR * 0.15;
    zTip = W / 2 + prongR * 0.15;
  } else {
    yTip = (W / 2) * diag + prongR * 0.5;
    zTip = (L / 2) * diag + prongR * 0.5;
  }

  // Prong bases splay down onto the band, staying within its width.
  const yBase = Math.min(2.1, yTip * 0.6);
  const zBase = Math.min((w / 2) * 0.8, zTip * 0.5);
  const xBase = Math.sqrt((Ro - 0.5) ** 2 - yBase ** 2);

  let head: Shape3D | null = null;
  for (const sy of [1, -1]) {
    for (const sz of [1, -1]) {
      const base: [number, number, number] = [xBase, sy * yBase, sz * zBase];
      const tip: [number, number, number] = [tipX, sy * yTip, sz * zTip];
      const d = [tip[0] - base[0], tip[1] - base[1], tip[2] - base[2]];
      const len = Math.hypot(d[0], d[1], d[2]);
      const prong = makeCylinder(prongR, len, base, d);
      // Claw tip: a cap nudged in over the stone.
      const cap = makeSphere(prongR).translate([
        tipX,
        sy * yTip * 0.9,
        sz * zTip * 0.9,
      ]);
      const clawProng = prong.fuse(cap);
      head = head ? head.fuse(clawProng) : clawProng;
    }
  }

  // Gallery rail: a torus under the stone passing through all four prongs.
  const xRail = girdleX - Math.min(1.5, (girdleX - Ro) * 0.55);
  const s = (xRail - xBase) / (tipX - xBase);
  const railMajor = Math.hypot(
    yBase + s * (yTip - yBase),
    zBase + s * (zTip - zBase),
  );
  const rail = drawCircle(0.42)
    .translate(railMajor, 0)
    .sketchOnPlane("XZ")
    .revolve()
    .rotate(90, [0, 0, 0], [0, 1, 0])
    .translate([xRail, 0, 0]) as Shape3D;

  const shape = band.fuse(head!.fuse(rail));
  const volumeMM3 = measureVolume(shape);

  return {
    shape,
    info: { girdleX, stoneWidthMM: W, stoneLengthMM: L, volumeMM3 },
  };
}
