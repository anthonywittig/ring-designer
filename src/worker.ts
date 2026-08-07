import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC } from "replicad";
import { expose } from "comlink";

import { buildRing } from "./ring";
import type { RingParams } from "./params";
import type { MeshResult } from "./worker-api";

let loaded = false;
const init = async () => {
  if (loaded) return true;
  const OC = await (opencascade as any)({
    locateFile: () => opencascadeWasm,
  });
  loaded = true;
  setOC(OC);
  return true;
};
const started = init();

async function createMesh(params: RingParams): Promise<MeshResult> {
  await started;
  const { shape, info } = buildRing(params);
  // Display mesh: fine enough that the band silhouette reads as a smooth
  // polished surface (15deg angular tolerance left visible facets).
  return { faces: shape.mesh({ tolerance: 0.01, angularTolerance: 5 }), info };
}

async function createBlob(params: RingParams): Promise<Blob> {
  await started;
  const { shape } = buildRing(params);
  return shape.blobSTL({ tolerance: 0.02, angularTolerance: 10 });
}

expose({ createMesh, createBlob });
