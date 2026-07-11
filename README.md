# Ring Designer Spike

A proof-of-concept for replacing a commercial e-commerce ring configurator with an
open source stack. Parametric engagement-ring geometry is generated **in the browser**
as real CAD solids (B-Rep, not display meshes) and exported as manufacturable STL.

## What it proves

- **Parametric band**: US ring size (3–13, standard diameter table), band width
  slider (1.5–4 mm), round or square profile, comfort or standard fit — all as a
  revolved CAD profile.
- **Stone-driven head**: cut (round / oval / princess) + carat → girdle dimensions
  from an industry mm table (cube-root carat scaling); a 4-prong claw head with
  gallery rail resizes and repositions from those dimensions. Princess prongs hug
  the corners; round/oval prongs sit at the 45° points of the girdle.
- **Real output**: exact metal volume from the CAD kernel → weight and a rough
  setting price per metal (14K/18K × Y/W/R, platinum); one click exports a
  watertight STL sized in mm.
- **All client-side**: the OpenCascade kernel runs as WASM in a web worker; the
  page is static hosting + zero geometry servers.

## Stack

| Concern | Library |
| --- | --- |
| CAD kernel | [replicad](https://replicad.xyz) (OpenCascade via WASM), in a web worker via [comlink](https://github.com/GoogleChromeLabs/comlink) |
| Rendering | three.js + @react-three/fiber, `replicad-threejs-helper` to sync kernel meshes |
| Gem display | convex-hull brilliant-cut mesh + drei `MeshRefractionMaterial` (ray-traced refraction & dispersion; display only, not in the STL) |
| App | Vite + React + TypeScript |

## Run it

```sh
npm install
npm run dev   # http://localhost:5199
```

The first geometry appears after the ~10 MB WASM kernel loads (cached afterwards).

## Architecture notes

- `src/params.ts` — the data layer: ring size table, stone dimension table, metal
  densities/prices. This is where a real catalog grows.
- `src/ring.ts` — the parametric model. Band = 2D profile revolved around Z;
  head = prongs + rail fused on, pointing +X.
- `src/worker.ts` — kernel init + `createMesh` / `createBlob` (STL) API.
- UI never touches the kernel; it posts params to the worker and renders what
  comes back, so a slow model can never freeze the controls.

## Known limitations (deliberate spike cuts)

- No stone seat cut into the prongs, no basket/halo/bezel/cathedral variants.
- Pear/marquise (V-prong tip family) not implemented.
- No pavé — this is the known performance risk to prove next.
- Lighting is hybrid by design: the metal is lit by a CC0 Poly Haven studio
  HDRI, while the diamond keeps a procedural high-contrast sparkle map —
  photographed studios are mostly dark walls, which reads black through a
  refractive stone.
- Prices/densities are placeholder constants in `params.ts`.
