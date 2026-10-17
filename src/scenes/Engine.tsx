import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useTap } from "./Hotspot";

/*
 * The third floor: the machine room. A stub until the hall is built.
 */

export default function Engine({
  onUp,
}: {
  reduced: boolean;
  /** Whether a scene is playing, for the desktop to clear itself. */
  onScene: (on: boolean) => void;
  /** The hole in the ceiling was tapped: back up to Babel. */
  onUp: () => void;
  /** When the visitor came down, or -Infinity if they were already here. */
  arrivedAt: number;
  /** Whether that was the first time down, which is the long way. */
  first: boolean;
}) {
  const leaving = useRef(false);
  const up = useTap(() => {
    if (leaving.current) return;
    leaving.current = true;
    onUp();
  });
  return (
    <Canvas orthographic camera={{ position: [7, 5.6, 7], zoom: 60 }}>
      <color attach="background" args={["#0B0705"]} />
      <mesh position={[0, 2.55, 0]} {...up}>
        <circleGeometry args={[0.45, 24]} />
        <meshBasicMaterial color="#3A3E45" />
      </mesh>
    </Canvas>
  );
}
