import {
  draw,
  drawCircle,
  makeCylinder,
  makeSphere,
  measureVolume,
  Plane,
  Sketch,
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
  bandOuterRadiusMM: number; // for placing the display floor/shadow
  volumeMM3: number;
}

type Vec3 = [number, number, number];

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

// --- Claw prong: a tapered loft along a quadratic bezier ---
// The prong emerges from the band shoulder (base), rises and bows slightly
// outward to meet the girdle, then curls INWARD over the stone crown, ending
// in a soft rounded tip (flush hemisphere cap — never LoftConfig.endPoint,
// which builds solids that later fuses choke on).

interface ClawProngOptions {
  baseRadius: number; // radius at the band shoulder
  tipRadius: number; // radius at the claw tip
  tipOvershoot: number; // how far past the girdle plane the tip reaches in +X
  tuckFactor: number; // how much the tip pulls in over the crown, 0..1
  bowFactor: number; // outward bow of the mid-prong
}

interface ClawCurve {
  tip: Vec3;
  ctrl: Vec3;
  bez: (t: number) => Vec3;
  tangent: (t: number) => Vec3;
}

function clawCurve(
  base: Vec3,
  girdlePoint: Vec3,
  opts: ClawProngOptions,
): ClawCurve {
  const { tipOvershoot, tuckFactor, bowFactor } = opts;
  const [gx, gy, gz] = girdlePoint;
  const tip: Vec3 = [
    gx + tipOvershoot,
    gy * (1 - tuckFactor),
    gz * (1 - tuckFactor),
  ];
  // Control point just below the girdle, slightly outside it: the prong
  // rises, bows out to meet the girdle, then curls inward.
  const ctrl: Vec3 = [gx - 0.4, gy * (1 + bowFactor), gz * (1 + bowFactor)];

  const bez = (t: number): Vec3 =>
    [0, 1, 2].map(
      (i) => (1 - t) ** 2 * base[i] + 2 * (1 - t) * t * ctrl[i] + t ** 2 * tip[i],
    ) as Vec3;
  const tangent = (t: number): Vec3 => {
    const v = [0, 1, 2].map(
      (i) => 2 * (1 - t) * (ctrl[i] - base[i]) + 2 * t * (tip[i] - ctrl[i]),
    );
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  return { tip, ctrl, bez, tangent };
}

function makeClawProng(
  base: Vec3,
  girdlePoint: Vec3,
  opts: ClawProngOptions,
): Shape3D {
  const { baseRadius, tipRadius } = opts;
  const { tip, bez, tangent } = clawCurve(base, girdlePoint, opts);

  const radiusAt = (t: number) => baseRadius + (tipRadius - baseRadius) * t;

  try {
    // Sketch.loftWith consumes its input sketches — build each inline.
    const section = (t: number, r: number) =>
      drawCircle(r).sketchOnPlane(new Plane(bez(t), null, tangent(t))) as Sketch;
    const body = section(0, baseRadius).loftWith([
      section(0.45, radiusAt(0.45)),
      section(0.8, radiusAt(0.8)),
      section(1, tipRadius),
    ]);
    // Flush hemisphere cap: radius EXACTLY the last section radius, centered
    // on the last section center — reads as a soft rounded tip, not a ball.
    const cap = makeSphere(tipRadius).translate(tip);
    return body.fuse(cap);
  } catch {
    // Fallback: stepped cylinders along the same bezier. At jewelry scale,
    // after meshing, 5 overlapping steps read as a smooth taper.
    return makeClawProngFallback(bez, radiusAt, tip, tipRadius);
  }
}

function makeClawProngFallback(
  bez: (t: number) => Vec3,
  radiusAt: (t: number) => number,
  tip: Vec3,
  tipRadius: number,
): Shape3D {
  const STEPS = 5;
  let shape: Shape3D | null = null;
  for (let i = 0; i < STEPS; i++) {
    const t0 = i / STEPS;
    const t1 = (i + 1) / STEPS;
    const p0 = bez(t0);
    const p1 = bez(t1);
    const d: Vec3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const len = Math.hypot(d[0], d[1], d[2]) * 1.15; // interpenetrate
    const seg = makeCylinder(radiusAt((t0 + t1) / 2), len, p0, d);
    shape = shape ? shape.fuse(seg) : seg;
  }
  const cap = makeSphere(tipRadius).translate(tip);
  return shape!.fuse(cap);
}

/** Radial distance (hypot of y,z) of the prong centerline where it crosses x = xPlane. */
function prongRadialAt(
  base: Vec3,
  ctrl: Vec3,
  tip: Vec3,
  xPlane: number,
): number {
  let best = 0;
  let bestErr = Infinity;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const p = [0, 1, 2].map(
      (k) => (1 - t) ** 2 * base[k] + 2 * (1 - t) * t * ctrl[k] + t ** 2 * tip[k],
    );
    const err = Math.abs(p[0] - xPlane);
    if (err < bestErr) {
      bestErr = err;
      best = Math.hypot(p[1], p[2]);
    }
  }
  return best;
}

/** A torus rail centered on the X (head) axis at x = xRail. */
function makeRail(xRail: number, majorR: number, minorR: number): Shape3D {
  return drawCircle(minorR)
    .translate(majorR, 0)
    .sketchOnPlane("XZ")
    .revolve()
    .rotate(90, [0, 0, 0], [0, 1, 0])
    .translate([xRail, 0, 0]) as Shape3D;
}

/**
 * A square rail at x = xRail: four cylindrical bars whose corners sit at the
 * prong centerlines (radial distance majorR, i.e. corners at ±majorR/√2).
 * Bars run 15% past each corner so they always interpenetrate the prongs.
 */
function makeSquareRail(
  xRail: number,
  majorR: number,
  minorR: number,
): Shape3D {
  const c = majorR * Math.SQRT1_2;
  const corners: Vec3[] = [
    [xRail, c, c],
    [xRail, -c, c],
    [xRail, -c, -c],
    [xRail, c, -c],
  ];
  let rail: Shape3D | null = null;
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    const start: Vec3 = [
      a[0] - d[0] * 0.075,
      a[1] - d[1] * 0.075,
      a[2] - d[2] * 0.075,
    ];
    const bar = makeCylinder(minorR, len * 1.15, start, d);
    rail = rail ? rail.fuse(bar) : bar;
  }
  return rail!;
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

  // --- Head: 4 tapered claw prongs + seat rail basket, sized from the stone ---
  const { widthMM: W, lengthMM: L } = stoneDims(params.cut, params.carat);
  const girdleX = Ro + 1.2 + 0.15 * W;
  const prongR = Math.min(0.65, Math.max(0.42, 0.32 + 0.035 * W));

  // Girdle contact point ON the girdle outline (the bow of the claw provides
  // clearance). Round/oval prongs sit at the 45-degree points of the
  // (elliptical) girdle; princess prongs hug the square's corners. The tip
  // reach scales with the stone so small stones keep the same proportions;
  // princess corners sit over a much lower crown, so those claws end sooner
  // and barely pull in.
  const diag = Math.SQRT1_2;
  let yG: number;
  let zG: number;
  let tipOvershoot: number;
  let tuckFactor: number;
  if (params.cut === "princess") {
    yG = W / 2;
    zG = W / 2;
    tipOvershoot = 0.095 * W;
    tuckFactor = 0.07;
  } else {
    yG = (W / 2) * diag;
    zG = (L / 2) * diag;
    tipOvershoot = 0.13 * W;
    tuckFactor = 0.18;
  }

  const claw: ClawProngOptions = {
    baseRadius: prongR,
    tipRadius: Math.max(0.24, prongR * 0.5),
    tipOvershoot,
    tuckFactor,
    bowFactor: 0.06,
  };

  // Prong bases converge down onto the band shoulders (open V-basket),
  // staying within the band width.
  const yBase = Math.min(2.1, yG * 0.6);
  const zBase = Math.min((w / 2) * 0.8, zG * 0.5);
  const xBase = Math.sqrt((Ro - 0.5) ** 2 - yBase ** 2);

  let head: Shape3D | null = null;
  for (const sy of [1, -1]) {
    for (const sz of [1, -1]) {
      const base: Vec3 = [xBase, sy * yBase, sz * zBase];
      const girdlePoint: Vec3 = [girdleX, sy * yG, sz * zG];
      const prong = makeClawProng(base, girdlePoint, claw);
      head = head ? head.fuse(prong) : prong;
    }
  }

  // Seat rail close under the girdle, threading through all four prongs.
  // Sized off the same bezier the prongs loft along so it always touches the
  // prong centerlines. Minor radius stays below the local prong radius so
  // the fuse always intersects cleanly.
  const refCurve = clawCurve([xBase, yBase, zBase], [girdleX, yG, zG], claw);
  const xRail = girdleX - 0.8;
  const railMajor = prongRadialAt(
    [xBase, yBase, zBase],
    refCurve.ctrl,
    refCurve.tip,
    xRail,
  );
  const railMinor = Math.min(0.35, prongR * 0.62);
  // A princess stone gets a square seat (four straight bars between the
  // corner prongs, following the square girdle footprint); a circular rail
  // under a square girdle reads as a stray halo. Round/oval keep the torus.
  const rail =
    params.cut === "princess"
      ? makeSquareRail(xRail, railMajor, railMinor)
      : makeRail(xRail, railMajor, railMinor);

  const shape = band.fuse(head!.fuse(rail));
  const volumeMM3 = measureVolume(shape);

  return {
    shape,
    info: {
      girdleX,
      stoneWidthMM: W,
      stoneLengthMM: L,
      bandOuterRadiusMM: Ro,
      volumeMM3,
    },
  };
}
