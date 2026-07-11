import React from "react";
import {
  METALS,
  type BandFit,
  type BandProfile,
  type MetalId,
  type RingParams,
  type StoneCut,
} from "../params";

const CUTS: { id: StoneCut; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "oval", label: "Oval" },
  { id: "princess", label: "Princess" },
];

const CARATS = [0.5, 1, 1.5, 2, 2.5, 3];

function OptionRow<T extends string | number>({
  options,
  value,
  onSelect,
}: {
  options: { id: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="opt-row">
      {options.map((o) => (
        <button
          key={String(o.id)}
          className={o.id === value ? "opt active" : "opt"}
          onClick={() => onSelect(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Controls({
  params,
  onChange,
}: {
  params: RingParams;
  onChange: (patch: Partial<RingParams>) => void;
}) {
  return (
    <div className="panel">
      <h2>Ring Designer</h2>
      <p className="hint">
        Parametric spike — every control regenerates real CAD geometry.
      </p>

      <section>
        <h3>Center Stone</h3>
        <label>Cut</label>
        <OptionRow
          options={CUTS}
          value={params.cut}
          onSelect={(cut) => onChange({ cut })}
        />
        <label>Carat</label>
        <OptionRow
          options={CARATS.map((c) => ({ id: c, label: `${c}` }))}
          value={params.carat}
          onSelect={(carat) => onChange({ carat })}
        />
      </section>

      <section>
        <h3>Band</h3>
        <label>Profile</label>
        <OptionRow
          options={[
            { id: "round", label: "Round" },
            { id: "square", label: "Square" },
          ]}
          value={params.profile}
          onSelect={(profile) => onChange({ profile: profile as BandProfile })}
        />
        <label>
          Width <span className="val">{params.bandWidthMM.toFixed(1)} mm</span>
        </label>
        <input
          type="range"
          min={1.5}
          max={4}
          step={0.1}
          value={params.bandWidthMM}
          onChange={(e) => onChange({ bandWidthMM: Number(e.target.value) })}
        />
        <label>
          Ring Size (US) <span className="val">{params.ringSizeUS}</span>
        </label>
        <input
          type="range"
          min={3}
          max={13}
          step={0.5}
          value={params.ringSizeUS}
          onChange={(e) => onChange({ ringSizeUS: Number(e.target.value) })}
        />
        <label>Fit</label>
        <OptionRow
          options={[
            { id: "comfort", label: "Comfort Fit" },
            { id: "standard", label: "Standard Fit" },
          ]}
          value={params.fit}
          onSelect={(fit) => onChange({ fit: fit as BandFit })}
        />
      </section>

      <section>
        <h3>Metal</h3>
        <OptionRow
          options={(Object.keys(METALS) as MetalId[]).map((id) => ({
            id,
            label: METALS[id].label,
          }))}
          value={params.metal}
          onSelect={(metal) => onChange({ metal })}
        />
      </section>
    </div>
  );
}
