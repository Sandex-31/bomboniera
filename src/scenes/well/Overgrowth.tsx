import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Group,
  type Texture,
} from "three";
import { WALL_H, onWall } from "../machines/hall";
import { SPRITES, spriteUrl, type SpriteId } from "../../lib/well/sprites";
import { PIT_R } from "./Altar";
import { PANEL } from "./Screen";
import { hash } from "./setting";
import { WALL_ANGLES, WELL_R } from "./wall";

/*
 * The hall dressed as a room of Animal Well, with the same sheets as the
 * screens: stone tiles on the wall and the floor, the grass all round the
 * foot of the wall, a bush here and there, the moss hanging from the top of
 * the wall and swaying, and fireflies drifting about. None of it takes a tap.
 */

/** One pixel of the game's art, in the hall: the grass strip comes out a little over a metre long. */
const PX = 0.015;

/** Decoration is not something to tap: the raycaster goes through it. */
const NONE = () => null;

const loader = new TextureLoader();
const loaded = new Map<string, Texture | null>();

/** A sprite's sheet as a pixel-sharp texture, repeated `x` by `y` times; nothing while its file is missing. */
function sheet(id: SpriteId, x = 1, y = 1): Texture | null {
  const key = `${id} ${x} ${y}`;
  if (!loaded.has(key)) {
    const url = spriteUrl(id);
    let t: Texture | null = null;
    if (url) {
      t = loader.load(url);
      t.magFilter = NearestFilter;
      t.minFilter = NearestFilter;
      t.generateMipmaps = false;
      t.colorSpace = SRGBColorSpace;
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(x, y);
    }
    loaded.set(key, t);
  }
  return loaded.get(key)!;
}

/** The art is bright, as in the game, but not as bright as a screen: the hall is dark. */
const DIM = "#9CB0A4";

/** Whether angle `a` is behind one of the screens, which hang from 0.5 to 1.4 up the wall. */
const behindScreen = (a: number) =>
  Object.values(WALL_ANGLES).some((w) => Math.abs(Math.atan2(Math.sin(a - w), Math.cos(a - w))) < (PANEL.w / 2 + 0.15) / WELL_R);

const GRASS_N = 18;
const VINE_STEP = 0.2;
const SEG = SPRITES.vine.h * PX;

type Vine = { a: number; n: number; phase: number };
const VINES: Vine[] = [];
for (let i = 0, a = 0; a < Math.PI * 2; i++, a += VINE_STEP * (0.6 + hash(i + 300))) {
  // over a screen the moss stops short of it; between the screens it hangs most of the way down
  const most = behindScreen(a) ? 3 : 10;
  VINES.push({ a, n: 1 + Math.floor(hash(i + 400) * most), phase: hash(i + 500) * 6.28 });
}

const BUSHES = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2 + hash(i + 600) * 0.4);

const FLIES = 26;
const FLY = Array.from({ length: FLIES }, (_, i) => ({
  a: hash(i + 700) * Math.PI * 2,
  r: PIT_R + 0.3 + hash(i + 710) * (WELL_R - PIT_R - 0.7),
  y: 0.2 + hash(i + 720) * 1.5,
  k: 0.6 + hash(i + 730),
  phase: hash(i + 740) * 6.28,
}));

/** A soft round glow, white, for the fireflies to be tinted. */
function glow() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const fill = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  fill.addColorStop(0, "rgba(255,255,255,1)");
  fill.addColorStop(0.25, "rgba(255,255,255,0.8)");
  fill.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = fill;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

/** The tiles of the wall and the floor, the same 8 pixel stones as the screens', twice as big. */
export function useStone() {
  return useMemo(() => {
    const tile = SPRITES.tile;
    const w = tile.w * tile.frames * PX * 2;
    const h = tile.h * PX * 2;
    return {
      wall: sheet("tile", Math.round((2 * Math.PI * WELL_R) / w), Math.round(WALL_H / h)),
      floor: sheet("tile", Math.round((2 * WELL_R) / w), Math.round((2 * WELL_R) / h)),
    };
  }, []);
}

export default function Overgrowth({ reduced }: { reduced: boolean }) {
  const grass = sheet("grass");
  const bush = sheet("bush");
  const vines = useRef<(Group | null)[]>([]);

  const flies = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(FLIES * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(FLIES * 3), 3));
    return g;
  }, []);
  const halo = useMemo(glow, []);

  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    VINES.forEach((v, i) => {
      const g = vines.current[i];
      if (g) g.rotation.z = Math.sin(t * 1.1 + v.phase) * 0.05;
    });
    const pos = flies.getAttribute("position") as BufferAttribute;
    const col = flies.getAttribute("color") as BufferAttribute;
    FLY.forEach((f, i) => {
      const a = f.a + t * 0.06 * f.k * (i % 2 ? 1 : -1);
      const r = f.r + Math.sin(t * 0.7 * f.k + f.phase) * 0.25;
      pos.setXYZ(i, Math.cos(a) * r, f.y + Math.sin(t * f.k + f.phase) * 0.15, Math.sin(a) * r);
      // each blinks on its own, and is dark half the time
      const on = Math.max(0, Math.sin(t * 1.3 * f.k + f.phase));
      col.setXYZ(i, 0.85 * on, 1 * on, 0.48 * on);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  // the strips meet round the wall, two rows deep, the inner one between the outer's joins
  const rows = [
    { inset: 0.02, turn: 0, h: SPRITES.grass.h * PX },
    { inset: 0.16, turn: Math.PI / GRASS_N, h: SPRITES.grass.h * PX * 0.75 },
  ];

  return (
    <group>
      {rows.map(({ inset, turn, h }, row) =>
        Array.from({ length: GRASS_N }, (_, i) => {
          const a = (i / GRASS_N) * Math.PI * 2 + turn;
          const w = 2 * (WELL_R - inset) * Math.sin(Math.PI / GRASS_N) + 0.02;
          return (
            <mesh key={`${row} ${i}`} {...onWall(a, inset, h / 2, WELL_R)} raycast={NONE}>
              <planeGeometry args={[w, h]} />
              {grass ? <meshBasicMaterial map={grass} color={DIM} alphaTest={0.5} /> : <meshBasicMaterial color={SPRITES.grass.key} transparent opacity={0.2} />}
            </mesh>
          );
        }),
      )}
      {BUSHES.map((a, i) => (
        <mesh key={i} {...onWall(a, 0.26, (SPRITES.bush.h * PX * 1.5) / 2, WELL_R)} raycast={NONE}>
          <planeGeometry args={[SPRITES.bush.w * PX * 1.5, SPRITES.bush.h * PX * 1.5]} />
          {bush ? <meshBasicMaterial map={bush} color={DIM} alphaTest={0.5} /> : <meshBasicMaterial color={SPRITES.bush.key} />}
        </mesh>
      ))}
      {VINES.map((v, i) => {
        const tex = sheet("vine", 1, v.n);
        return (
          <group key={i} {...onWall(v.a, 0.01, WALL_H, WELL_R)}>
            {/* swung from its top, in the plane of the wall */}
            <group ref={(g) => void (vines.current[i] = g)}>
              <mesh position={[0, (-v.n * SEG) / 2, 0]} raycast={NONE}>
                <planeGeometry args={[SPRITES.vine.w * PX, v.n * SEG]} />
                {tex ? <meshBasicMaterial map={tex} color={DIM} alphaTest={0.5} /> : <meshBasicMaterial color={SPRITES.vine.key} />}
              </mesh>
            </group>
          </group>
        );
      })}
      <points geometry={flies} raycast={NONE}>
        <pointsMaterial map={halo} size={9} sizeAttenuation={false} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
}
