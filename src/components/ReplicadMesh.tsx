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
      {/* Soft-studio metal: the roughness blurs the PMREM mips into broad
          soft highlight sweeps; intensity stays moderate so pale metals keep
          metallic value range instead of washing to porcelain. */}
      <meshPhysicalMaterial
        color={color}
        metalness={1}
        roughness={0.13}
        envMapIntensity={1.05}
        clearcoat={0.3}
        clearcoatRoughness={0.4}
      />
    </mesh>
  );
});
