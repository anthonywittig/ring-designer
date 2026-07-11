import React, { useEffect, useMemo, useRef, useState } from "react";
import { wrap } from "comlink";
import FileSaver from "file-saver";

import RingViewer from "./components/RingViewer";
import Controls from "./components/Controls";
import { DEFAULT_PARAMS, settingPriceUSD, type RingParams } from "./params";
import type { CadApi, MeshResult } from "./worker-api";

import CadWorker from "./worker?worker";

const cad = wrap<CadApi>(new CadWorker());

export default function App() {
  const [params, setParams] = useState<RingParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<MeshResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setBusy(true);
    const timer = setTimeout(() => {
      cad
        .createMesh(params)
        .then((r) => {
          if (id !== requestId.current) return;
          setResult(r);
          setBusy(false);
        })
        .catch((err) => {
          console.error("geometry generation failed", err);
          if (id === requestId.current) setBusy(false);
        });
    }, 120);
    return () => clearTimeout(timer);
  }, [params]);

  const price = useMemo(
    () =>
      result ? settingPriceUSD(result.info.volumeMM3, params.metal) : null,
    [result, params.metal],
  );

  useEffect(() => {
    // Debug/verification hook: generate the STL without saving it.
    (window as any).__ringDebug = {
      stlSize: async () => (await cad.createBlob(params)).size,
      params,
      volume: result?.info.volumeMM3,
    };
  }, [params, result]);

  const exportSTL = async () => {
    setExporting(true);
    try {
      const blob = await cad.createBlob(params);
      FileSaver.saveAs(
        blob,
        `ring-${params.cut}-${params.carat}ct-size${params.ringSizeUS}.stl`,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app">
      <div className="main">
        <div className="canvas-wrap">
          <RingViewer result={result} params={params} />
          {busy && <div className="busy">Computing geometry…</div>}
        </div>
        <div className="bottombar">
          {result && price ? (
            <>
              <div className="stat">
                <span className="stat-label">Stone</span>
                {result.info.stoneWidthMM.toFixed(1)} ×{" "}
                {result.info.stoneLengthMM.toFixed(1)} mm
              </div>
              <div className="stat">
                <span className="stat-label">Metal volume</span>
                {result.info.volumeMM3.toFixed(0)} mm³
              </div>
              <div className="stat">
                <span className="stat-label">Weight</span>
                {price.grams.toFixed(2)} g
              </div>
              <div className="stat">
                <span className="stat-label">Est. setting price</span>$
                {price.total.toFixed(0)}{" "}
                <span className="fine">(rough estimate, no stone)</span>
              </div>
            </>
          ) : (
            <div className="stat">Loading CAD kernel…</div>
          )}
          <button
            className="export"
            onClick={exportSTL}
            disabled={busy || exporting || !result}
          >
            {exporting ? "Exporting…" : "Export STL"}
          </button>
        </div>
      </div>
      <Controls
        params={params}
        onChange={(patch) => setParams((p) => ({ ...p, ...patch }))}
      />
    </div>
  );
}
