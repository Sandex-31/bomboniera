import { useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";

type Props = {
  position: [number, number, number];
  label: string;
  /** Height of the floating label above the object origin. */
  labelHeight?: number;
  /** Radius of the gold ring drawn on the floor; 0 hides it. */
  ring?: number;
  /** Moves the ring off the object origin, e.g. in front of a bookshelf. */
  ringOffset?: [number, number, number];
  /** Secret objects get a dimmer marker and no ring. */
  secret?: boolean;
  /** Another area is open: stop reacting and get out of the way. */
  muted?: boolean;
  /**
   * Invisible box that catches taps, for objects too small to hit reliably on
   * a phone. Opt-in: a hotspot that already wraps something big does not want
   * one, because the pad would swallow taps meant for the parts inside it.
   */
  hit?: [number, number, number];
  hitOffset?: [number, number, number];
  reduced: boolean;
  onSelect: () => void;
  children: ReactNode;
};

/** How far a finger may drift between press and release and still be a tap. */
const TAP_SLOP = 14;

/**
 * Tap handling that survives a thumb.
 *
 * React Three Fiber only fires `onClick` when the pointer moved two pixels or
 * less between press and release — fine for a mouse, hopeless for a touch,
 * where a tap routinely drifts five to ten. Small objects end up impossible to
 * hit on a phone no matter how large their hit area is. This accepts any press
 * that stayed within TAP_SLOP and came back up on the same object.
 */
export function useTap(onTap: () => void, enabled = true) {
  const from = useRef<{ x: number; y: number; id: number } | null>(null);

  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return;
      const { clientX, clientY, pointerId } = e.nativeEvent;
      from.current = { x: clientX, y: clientY, id: pointerId };
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      const start = from.current;
      from.current = null;
      if (!enabled || !start || start.id !== e.nativeEvent.pointerId) return;
      const moved = Math.hypot(e.nativeEvent.clientX - start.x, e.nativeEvent.clientY - start.y);
      if (moved > TAP_SLOP) return; // it was a drag to turn the camera
      e.stopPropagation();
      onTap();
    },
  };
}

/**
 * Wraps a piece of scene geometry and makes it feel touchable:
 * hover lift on desktop, tap on mobile, floating label, floor ring.
 */
export default function Hotspot({
  position,
  label,
  labelHeight = 1.1,
  ring = 0,
  ringOffset = [0, 0, 0],
  secret = false,
  muted = false,
  hit,
  hitOffset = [0, 0, 0],
  reduced,
  onSelect,
  children,
}: Props) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const tap = useTap(() => {
    setCursor(false);
    onSelect();
  }, !muted);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const target = hovered && !reduced && !muted ? 1.07 : 1;
    const k = 1 - Math.pow(0.0015, delta);
    g.scale.setScalar(g.scale.x + (target - g.scale.x) * k);
  });

  const setCursor = (on: boolean) => {
    document.body.style.cursor = on ? "pointer" : "auto";
  };

  return (
    <group position={position}>
      {ring > 0 && !muted && (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[ringOffset[0], 0.012 + ringOffset[1], ringOffset[2]]}
        >
          <ringGeometry args={[ring, ring + 0.035, 40]} />
          <meshBasicMaterial color="#E3B04B" transparent opacity={hovered ? 0.55 : 0.22} />
        </mesh>
      )}

      <group
        ref={group}
        onPointerOver={(e) => {
          if (muted) return;
          e.stopPropagation();
          setHovered(true);
          setCursor(true);
        }}
        onPointerOut={() => {
          setHovered(false);
          setCursor(false);
        }}
        {...tap}
      >
        {hit && !muted && (
          <mesh position={hitOffset}>
            <boxGeometry args={hit} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
        {children}
      </group>

      {!muted && (
        <Html position={[0, labelHeight, 0]} center zIndexRange={[5, 0]}>
          <div
            className={`hotspot-label${hovered ? " is-active" : ""}${secret ? " hotspot-label--secret" : ""}`}
          >
            <span className="hotspot-label__text">{label}</span>
            <span className="hotspot-label__dot" />
          </div>
        </Html>
      )}
    </group>
  );
}
