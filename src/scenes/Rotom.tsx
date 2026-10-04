import { useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { STLLoader } from "three-stdlib";
import bodyUrl from "../assets/rotom/rotom-body.stl?url";
import electricUrl from "../assets/rotom/rotom-electric.stl?url";
import haloUrl from "../assets/rotom/rotom-halo.stl?url";

/*
 * The model is "Rotom" by IdjeA (Thingiverse thing:4729117), used under
 * Creative Commons — Attribution. The credit is in README.md and `npm test`
 * fails if it goes missing. The three files are the print's three parts, all
 * in one coordinate frame: the body, the electric frame around it, and the
 * flat plate that backs the halo.
 */

const BODY = "#F4761C";
const BODY_HOT = "#FFAE4A";
const ELECTRIC = "#FFC65A";
const HALO = "#8AD8FF";

/** How wide the keeper stands, in world units. The print is in millimetres. */
const TARGET_W = 1.45;

/**
 * Which way the print faces once it is stood upright. The model was drawn for
 * a printer, not for a camera, so this is the one number to flip if it ever
 * turns its back on the visitor.
 */
const FACING = 0.25;

/*
 * The face is engraved into the body, not modelled: grooves a millimetre deep
 * and nothing to colour. These numbers were measured off the mesh rather than
 * guessed — the body is a sphere of radius 25 mm centred at z = -0.5, the
 * grooves sit on the side facing 110° round from +x, the eyes are two ovals of
 * about 11 x 15 mm at 13.3 mm either side of the middle and level with the
 * equator, and the grin runs from its corners at v = -8 down to v = -16.5.
 * Re-measure with the same method if the model is ever swapped.
 */
const SPHERE_R = 25;
const SPHERE_CZ = -0.5;
const FACE_ANGLE = (-110 * Math.PI) / 180;
const EYE_U = 13.3;
const EYE_W = 10.4;
const EYE_H = 14;
const MOUTH_HALF = 9.5;
const MOUTH_TOP = -8.2;
/** How deep the grin dips in the middle, and how far its floor drops. */
const MOUTH_LIP = 2.3;
const MOUTH_DROP = 8.3;
/** How far a fill floats over the surface, so the groove still rims it. */
const LIFT = 1.15;

const EYE = "#43B7DC";
const EYE_DEEP = "#12506B";
const GRIN = "#F4EFE6";

const FACE_DIR = new Vector3(Math.cos(FACE_ANGLE), Math.sin(FACE_ANGLE), 0);
const FACE_RIGHT = new Vector3(-Math.sin(FACE_ANGLE), Math.cos(FACE_ANGLE), 0);
const FACE_UP = new Vector3(0, 0, 1);

/**
 * A point on the face, given in the flat millimetres the measurements are in:
 * `u` across, `v` up, `lift` off the surface. Everything drawn on the head
 * goes through here, so nothing has to guess at the curve of the sphere.
 */
function onFace(u: number, v: number, lift: number) {
  const depth = Math.sqrt(Math.max(1, SPHERE_R * SPHERE_R - u * u - v * v));
  const dir = FACE_RIGHT.clone()
    .multiplyScalar(u)
    .addScaledVector(FACE_UP, v)
    .addScaledVector(FACE_DIR, depth)
    .normalize();
  return dir.multiplyScalar(SPHERE_R + lift).add(new Vector3(0, 0, SPHERE_CZ));
}

/**
 * Where a flat piece sits on the face and which way it looks. The frame is
 * built explicitly, with the model's own up as up: letting three.js pick a
 * rotation onto the normal would leave an arbitrary twist and the ovals would
 * sit crooked.
 */
function placeOnFace(u: number, v: number, lift: number) {
  const p = onFace(u, v, lift);
  const dir = p.clone().sub(new Vector3(0, 0, SPHERE_CZ)).normalize();
  const x = new Vector3().crossVectors(FACE_UP, dir).normalize();
  const y = new Vector3().crossVectors(dir, x);
  const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, dir));
  return {
    position: [p.x, p.y, p.z] as [number, number, number],
    quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number],
  };
}

/**
 * The grin, as a strip of quads laid along the sphere rather than a flat shape
 * floating over it: nineteen millimetres of flat fill would sink its corners
 * into a head this round, and the body would show through the middle.
 */
function grinGeometry() {
  const steps = 28;
  const verts: number[] = [];
  const top = (u: number) => MOUTH_TOP - MOUTH_LIP * (1 - (u / MOUTH_HALF) ** 2);
  const bottom = (u: number) => MOUTH_TOP - MOUTH_DROP * (1 - (u / MOUTH_HALF) ** 2);

  for (let i = 0; i < steps; i++) {
    const u0 = -MOUTH_HALF + (2 * MOUTH_HALF * i) / steps;
    const u1 = -MOUTH_HALF + (2 * MOUTH_HALF * (i + 1)) / steps;
    const a = onFace(u0, top(u0), LIFT);
    const b = onFace(u1, top(u1), LIFT);
    const c = onFace(u1, bottom(u1), LIFT);
    const d = onFace(u0, bottom(u0), LIFT);
    verts.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    verts.push(...a.toArray(), ...c.toArray(), ...d.toArray());
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function Rotom({
  reduced,
  zapAt,
  awake,
}: {
  reduced: boolean;
  /** Time of the last tap, in `performance.now()` ms. Drives the flinch. */
  zapAt: number;
  /** Calm once the way is open: it stops buzzing and just floats. */
  awake: boolean;
}) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const electric = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);

  const parts = useLoader(STLLoader, [bodyUrl, electricUrl, haloUrl]) as BufferGeometry[];

  /**
   * The three parts are placed relative to each other, not to the origin, and
   * they are printer-sized. Measuring them together keeps the assembly intact:
   * one offset and one scale for all three, derived rather than guessed.
   */
  const { scale, offset } = useMemo(() => {
    const box = new Box3();
    for (const geo of parts) {
      geo.computeBoundingBox();
      if (geo.boundingBox) box.union(geo.boundingBox);
    }
    const size = box.getSize(new Vector3());
    const mid = box.getCenter(new Vector3());
    return {
      scale: TARGET_W / Math.max(size.x, 1),
      // z is up in a print file, so the model's z becomes the scene's y
      offset: [-mid.x, -mid.y, -mid.z] as [number, number, number],
    };
  }, [parts]);

  const face = useMemo(
    () => ({
      eyes: [-1, 1].map((side) => ({ side, ...placeOnFace(side * EYE_U, 0, LIFT) })),
      grin: grinGeometry(),
    }),
    [],
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // face the camera, but only around y: a plasma ghost that rolls is a bug
    g.rotation.y =
      Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z) + FACING;

    const hit = Math.max(0, 1 - (performance.now() - zapAt) / 420);
    const jolt = reduced ? 0 : hit * hit;

    g.position.y = 1.12 + (reduced ? 0 : Math.sin(t * 1.6) * 0.06) - jolt * 0.09;
    g.rotation.z = reduced ? 0 : Math.sin(t * 0.9) * 0.04 - jolt * 0.1;
    g.scale.set(1 + jolt * 0.16, 1 - jolt * 0.08, 1 + jolt * 0.16);

    const buzz = reduced || !awake ? 0 : (Math.sin(t * 17) + 1) * 0.08;
    if (body.current) {
      (body.current.material as MeshStandardMaterial).emissiveIntensity = 0.35 + buzz + jolt * 1.6;
    }
    if (electric.current) {
      (electric.current.material as MeshStandardMaterial).emissiveIntensity =
        0.7 + buzz * 2 + jolt * 2.4;
    }
  });

  return (
    <group ref={group} position={[0, 1.12, 0]}>
      {/* stood upright and centred on what was measured above */}
      <group rotation-x={-Math.PI / 2} scale={scale}>
        <group position={offset}>
          <mesh ref={body} geometry={parts[0]}>
            <meshStandardMaterial
              color={BODY}
              emissive={BODY_HOT}
              emissiveIntensity={0.35}
              roughness={0.4}
              metalness={0.05}
            />
          </mesh>
          <mesh ref={electric} geometry={parts[1]}>
            <meshStandardMaterial
              color={ELECTRIC}
              emissive={ELECTRIC}
              emissiveIntensity={0.7}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
          <mesh geometry={parts[2]}>
            <meshStandardMaterial
              color={HALO}
              emissive={HALO}
              emissiveIntensity={0.9}
              roughness={0.25}
            />
          </mesh>

          {/* the grin, filled along the curve of the head */}
          <mesh geometry={face.grin}>
            <meshStandardMaterial color={GRIN} roughness={0.45} />
          </mesh>

          {/* the eyes the print only outlines */}
          {face.eyes.map(({ side, position, quaternion }) => (
            <group key={side} position={position} quaternion={quaternion}>
              <mesh scale={[EYE_W / 2, EYE_H / 2, 1]}>
                <circleGeometry args={[1, 32]} />
                <meshStandardMaterial
                  color={EYE}
                  emissive={EYE}
                  emissiveIntensity={0.45}
                  roughness={0.2}
                />
              </mesh>
              {/* pupil and glint, the way the artwork has them */}
              <mesh position={[side * -0.8, -1.2, 0.25]} scale={[2.1, 3.4, 1]}>
                <circleGeometry args={[1, 24]} />
                <meshStandardMaterial color={EYE_DEEP} roughness={0.35} />
              </mesh>
              <mesh position={[side * 1.7, 3.6, 0.4]} scale={[1.5, 2, 1]}>
                <circleGeometry args={[1, 20]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      <pointLight color={BODY_HOT} intensity={6} distance={5} />
    </group>
  );
}
