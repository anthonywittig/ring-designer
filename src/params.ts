export type StoneCut = "round" | "oval" | "princess";
export type BandProfile = "round" | "square";
export type BandFit = "standard" | "comfort";
export type MetalId =
  | "14k-yellow"
  | "14k-white"
  | "14k-rose"
  | "18k-yellow"
  | "18k-white"
  | "18k-rose"
  | "platinum";

export interface RingParams {
  cut: StoneCut;
  carat: number;
  bandWidthMM: number;
  ringSizeUS: number;
  profile: BandProfile;
  fit: BandFit;
  metal: MetalId;
}

export const DEFAULT_PARAMS: RingParams = {
  cut: "round",
  carat: 1.5,
  bandWidthMM: 1.8,
  ringSizeUS: 6,
  profile: "round",
  fit: "standard",
  metal: "14k-yellow",
};

// US ring size -> inner diameter (mm). Standard: each full size adds
// 0.8128mm of diameter; size 3 = 14.07mm.
export function innerDiameterMM(sizeUS: number): number {
  return 11.63 + 0.8128 * sizeUS;
}

export interface StoneDims {
  // Width across the band direction (Y), length along the finger (Z), both mm.
  widthMM: number;
  lengthMM: number;
}

// Girdle dimensions for a 1-carat stone of each cut; other weights scale
// with the cube root of carat (weight grows with volume).
const ONE_CARAT: Record<StoneCut, StoneDims> = {
  round: { widthMM: 6.5, lengthMM: 6.5 },
  oval: { widthMM: 5.7, lengthMM: 7.7 },
  princess: { widthMM: 5.5, lengthMM: 5.5 },
};

export function stoneDims(cut: StoneCut, carat: number): StoneDims {
  const scale = Math.cbrt(carat);
  const base = ONE_CARAT[cut];
  return {
    widthMM: base.widthMM * scale,
    lengthMM: base.lengthMM * scale,
  };
}

export interface MetalInfo {
  label: string;
  densityGCM3: number;
  pricePerGram: number; // metal cost only, rough 2026 estimate
  color: string; // three.js material color
}

export const METALS: Record<MetalId, MetalInfo> = {
  "14k-yellow": { label: "14K Yellow", densityGCM3: 13.0, pricePerGram: 62, color: "#e8c07c" },
  "14k-white": { label: "14K White", densityGCM3: 12.7, pricePerGram: 62, color: "#e9eaec" },
  "14k-rose": { label: "14K Rose", densityGCM3: 13.0, pricePerGram: 62, color: "#e6a889" },
  "18k-yellow": { label: "18K Yellow", densityGCM3: 15.5, pricePerGram: 80, color: "#eec66f" },
  "18k-white": { label: "18K White", densityGCM3: 15.7, pricePerGram: 80, color: "#ecedef" },
  "18k-rose": { label: "18K Rose", densityGCM3: 15.2, pricePerGram: 80, color: "#e8a184" },
  platinum: { label: "Platinum", densityGCM3: 21.4, pricePerGram: 34, color: "#e3e5ea" },
};

// Flat labor estimate: casting + finishing + setting. Placeholder constants.
export const LABOR_USD = 230;

export function settingPriceUSD(volumeMM3: number, metal: MetalId): {
  grams: number;
  metalCost: number;
  total: number;
} {
  const info = METALS[metal];
  const grams = (volumeMM3 / 1000) * info.densityGCM3;
  const metalCost = grams * info.pricePerGram;
  return { grams, metalCost, total: metalCost + LABOR_USD };
}
