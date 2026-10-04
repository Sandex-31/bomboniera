import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from "three";

/**
 * The way through: a standing ring with a lit surface inside it.
 *
 * Both ends of the jump use it — the one that opens in the room and the one
 * that brings you back — so the two sides read as the same object seen twice.
 * Its origin sits on the floor; the ring is lifted from here, not by the caller.
 */
export default function Portal({
  reduced,
  color = "#8AD8FF",
}: {
  reduced: boolean;
  /** Gold on the way back, so the return is not mistaken for another way out. */
  color?: string;
}) {
  const arc = useRef<Group>(null);
  const eye = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // the open arc is the only part whose spin is visible — a full torus turning
    // on its own axis looks exactly like a torus standing still
    if (arc.current && !reduced) arc.current.rotation.z = t * 0.7;
    if (eye.current) {
      const m = eye.current.material as MeshBasicMaterial;
      m.opacity = reduced ? 0.5 : 0.44 + Math.sin(t * 2.2) * 0.12;
    }
  });

  return (
    <group position={[0, 0.85, 0]}>
      <mesh>
        <torusGeometry args={[0.72, 0.055, 8, 40]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.1}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      <group ref={arc}>
        <mesh>
          <torusGeometry args={[0.82, 0.018, 6, 26, Math.PI * 1.15]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} />
        </mesh>
      </group>

      <mesh ref={eye}>
        <circleGeometry args={[0.69, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.44}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={color} intensity={3.5} distance={3.4} />
    </group>
  );
}
