import React, { useEffect, useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { BufferGeometry } from "three";
import { syncFaces } from "replicad-threejs-helper";

export default React.memo(function ReplicadMesh({
  faces,
  color,
}: {
  faces: any;
  color: string;
}) {
  const { invalidate } = useThree();
  const geometry = useRef(new BufferGeometry());

  useLayoutEffect(() => {
    if (faces) syncFaces(geometry.current, faces);
    invalidate();
  }, [faces, invalidate]);

  useEffect(
    () => () => {
      geometry.current.dispose();
      invalidate();
    },
    [invalidate],
  );

  return (
    <mesh geometry={geometry.current}>
      {/* Polished metal: low roughness for tight env reflections, a light
          clearcoat for the wet "just buffed" highlight jewelers photograph. */}
      <meshPhysicalMaterial
        color={color}
        metalness={1}
        roughness={0.09}
        envMapIntensity={1.25}
        clearcoat={0.6}
        clearcoatRoughness={0.22}
      />
    </mesh>
  );
});
