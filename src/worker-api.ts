import type { RingGeometryInfo } from "./ring";
import type { RingParams } from "./params";

export interface MeshResult {
  faces: any;
  info: RingGeometryInfo;
}

export interface CadApi {
  createMesh(params: RingParams): Promise<MeshResult>;
  createBlob(params: RingParams): Promise<Blob>;
}
