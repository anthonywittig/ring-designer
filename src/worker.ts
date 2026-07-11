import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC } from "replicad";
import { expose } from "comlink";

import { buildRing, type RingGeometryInfo } from "./ring";
import type { RingParams } from "./params";

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

export interface MeshResult {
  faces: unknown; // replicad mesh payload, consumed by replicad-threejs-helper
  info: RingGeometryInfo;
}

async function createMesh(params: RingParams): Promise<MeshResult> {
  await started;
  const { shape, info } = buildRing(params);
  return { faces: shape.mesh({ tolerance: 0.05, angularTolerance: 15 }), info };
}

async function createBlob(params: RingParams): Promise<Blob> {
  await started;
  const { shape } = buildRing(params);
  return shape.blobSTL({ tolerance: 0.02, angularTolerance: 10 });
}

expose({ createMesh, createBlob });
