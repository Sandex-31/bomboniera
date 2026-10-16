import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Matrix4,
  TubeGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";

/* ------------------------------------------------------------ the manhole */

const LID_R = 0.3;
/** How long the lid takes to slide off, in ms. */
const SLIDE = 1200;

/**
 * Cast iron, set in the floor under the keeper, where the cables meet. Its
 * word was found in a window; this is the thing the word was about.
 */
export function Manhole({ openAt, reduced }: { openAt: number; reduced: boolean }) {
  const lid = useRef<Group>(null);
  /** The ribs on the lid, built once. */
  const rib = useMemo(() => new BoxGeometry(LID_R * 1.7, 0.012, 0.022), []);
  useEffect(() => () => rib.dispose(), [rib]);

  useFrame(() => {
    const g = lid.current;
    if (!g) return;
    const p = reduced ? 1 : Math.min(1, Math.max(0, (performance.now() - openAt) / SLIDE));
    const e = 1 - (1 - p) ** 3;
    // lifted a little to clear the rim, then slid off to the side
    g.position.set(e * 0.72, 0.02 + Math.sin(Math.min(1, p * 2) * Math.PI) * 0.04, e * -0.18);
    g.rotation.y = e * 0.6;
  });

  return (
    <group position={[0, 0.006, 0]}>
      {/* the shaft, black all the way down */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
        <circleGeometry args={[LID_R, 40]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* the rim it sits in */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
        <ringGeometry args={[LID_R, LID_R + 0.06, 40]} />
        <meshStandardMaterial color="#3A3E45" metalness={0.6} roughness={0.5} />
      </mesh>
      <group ref={lid}>
        <mesh>
          <cylinderGeometry args={[LID_R, LID_R, 0.03, 40]} />
          <meshStandardMaterial color="#2B2E33" metalness={0.7} roughness={0.45} />
        </mesh>
        {/* the cast pattern: a ring and crossed ribs */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.016, 0]}>
          <ringGeometry args={[LID_R * 0.72, LID_R * 0.8, 40]} />
          <meshStandardMaterial color="#454A52" metalness={0.7} roughness={0.4} />
        </mesh>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a) => (
          <mesh key={a} geometry={rib} position={[0, 0.02, 0]} rotation-y={a}>
            <meshStandardMaterial color="#454A52" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- the tower */

/** How many tiers it goes down, how tall each one is, and how far each steps in. */
const TIERS = 8;
const TIER_H = 0.95;
const TOP_R = 2.4;
const STEP_IN = 0.24;
/** Arches round each tier: one per this much of its circumference. */
const ARCH_EVERY = 0.42;

const radiusAt = (i: number) => TOP_R - i * STEP_IN;

/**
 * The tower of Babel, upside down: the island is the top of it, and it goes
 * down into the dark a terrace at a time, each one stepped in from the one
 * above and ringed with arches, a ramp winding down round the outside.
 * Nothing in it is reachable yet — it is the next place, seen for the first
 * time.
 */
export function Tower() {
  const parts = useMemo(() => {
    // straight-sided terraces: the step between two of them is what makes it
    // a ziggurat and not a cone
    const tiers = Array.from({ length: TIERS }, (_, i) => {
      const r = radiusAt(i);
      return {
        y: -(i + 0.5) * TIER_H,
        body: new CylinderGeometry(r, r, TIER_H, 48),
        lip: new CylinderGeometry(r + 0.04, r + 0.04, 0.07, 48),
      };
    });

    // every arch of every tier, as one instanced mesh
    const arch = new BoxGeometry(0.16, 0.34, 0.06);
    const spots: Matrix4[] = [];
    tiers.forEach((t, i) => {
      const r = radiusAt(i);
      const n = Math.max(8, Math.round((2 * Math.PI * r) / ARCH_EVERY));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + i * 0.3;
        const m = new Matrix4().makeRotationY(-a + Math.PI / 2);
        m.setPosition(Math.cos(a) * (r + 0.005), t.y - 0.06, Math.sin(a) * (r + 0.005));
        spots.push(m);
      }
    });

    // the ramp: three quarters of a turn per tier, on the step below
    const points: Vector3[] = [];
    const turns = TIERS * 0.75;
    const steps = Math.round(turns * 64);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const depth = t * TIERS * TIER_H;
      const r = radiusAt(depth / TIER_H) + 0.12;
      const a = t * turns * Math.PI * 2;
      points.push(new Vector3(Math.cos(a) * r, -0.12 - depth, Math.sin(a) * r));
    }
    const ramp = new TubeGeometry(new CatmullRomCurve3(points), steps, 0.06, 6, false);

    return { tiers, arch, spots, ramp };
  }, []);

  const arches = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = arches.current;
    if (!m) return;
    parts.spots.forEach((s, i) => m.setMatrixAt(i, s));
    m.instanceMatrix.needsUpdate = true;
  }, [parts]);

  useEffect(
    () => () => {
      parts.tiers.forEach((t) => {
        t.body.dispose();
        t.lip.dispose();
      });
      parts.arch.dispose();
      parts.ramp.dispose();
    },
    [parts],
  );

  return (
    /* a hair below the island, or the top of the first tier and the island
       floor fight over the same pixels */
    <group position={[0, -0.02, 0]}>
      {parts.tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]}>
          <mesh geometry={t.body}>
            <meshStandardMaterial color={i % 2 ? "#B48A57" : "#C49A64"} roughness={0.95} />
          </mesh>
          <mesh geometry={t.lip} position={[0, -TIER_H / 2, 0]}>
            <meshStandardMaterial color="#DDB884" roughness={0.85} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={arches} args={[parts.arch, undefined, parts.spots.length]}>
        <meshStandardMaterial color="#2A1A10" roughness={1} />
      </instancedMesh>
      <mesh geometry={parts.ramp}>
        <meshStandardMaterial color="#E2C08F" roughness={0.8} />
      </mesh>
      {/* its own light: warm from the front and a touch from below, so it
          lights the walls and not the island floor above them */}
      <directionalLight position={[6, -2, 6]} intensity={1.8} color="#FFE2B8" />
      <pointLight position={[0, -TIERS * TIER_H - 1.5, 0]} intensity={50} distance={TIERS * TIER_H + 4} color="#FF9A4A" />
    </group>
  );
}
