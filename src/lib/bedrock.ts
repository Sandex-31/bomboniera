/**
 * Minecraft Bedrock models, as Cobblemon ships its Pokémon, turned into
 * three.js meshes.
 *
 * The format is boxes on a pixel grid, hung on bones that turn about a pivot,
 * textured by "box UV": one corner per box in a small pixel-art sheet, the six
 * faces unfolded around it in a fixed pattern. The conventions are the ones
 * Blockbench uses when it imports the same files, so a model that looks right
 * there looks right here:
 *
 * - x is mirrored on the way in (Bedrock's x points the other way);
 * - rotations are degrees, x and y negated for the same reason, applied Z
 *   then Y then X about the pivot;
 * - `inflate` grows a box on every side without touching its UVs.
 *
 * Only array UVs ("box UV") are read, which is all the Rotom files use.
 * ponytail: per-face UV objects would need a second branch in `boxUV`.
 */
import { BoxGeometry, Euler, Group, Mesh, type Material } from "three";

type V3 = [number, number, number];

export type Cube = {
  origin: V3;
  size: V3;
  uv: [number, number];
  inflate?: number;
  mirror?: boolean;
  pivot?: V3;
  rotation?: V3;
};

export type Bone = {
  name: string;
  parent?: string;
  pivot: V3;
  rotation?: V3;
  cubes?: Cube[];
};

/** One entry of a `.geo.json`'s `minecraft:geometry` list. */
export type Geo = {
  description: { texture_width: number; texture_height: number };
  bones: Bone[];
};

type Face = "east" | "west" | "up" | "down" | "south" | "north";
/** A face's patch of the sheet: left, top, width, height, in texture pixels. */
type Rect = [number, number, number, number];

/** A pixel is a sixteenth of a block, and a block is one world unit. */
const PX = 1 / 16;

/**
 * Where each face of a box sits on the sheet, laid out the way Blockbench
 * lays it: the four sides in a strip under the top and bottom. A negative
 * size is a patch read backwards, which is how the bottom comes out the
 * right way up. A mirrored box swaps its two ends and reads every patch
 * right to left.
 */
export function boxUV([u, v]: [number, number], [x, y, z]: V3, mirror: boolean): Record<Face, Rect> {
  const rects: Record<Face, Rect> = {
    east: [u, v + z, z, y],
    north: [u + z, v + z, x, y],
    west: [u + z + x, v + z, z, y],
    south: [u + 2 * z + x, v + z, x, y],
    up: [u + z, v, x, z],
    down: [u + z + x, v + z, x, -z],
  };
  if (!mirror) return rects;
  const flip = ([l, t, w, h]: Rect): Rect => [l + w, t, -w, h];
  return {
    east: flip(rects.west),
    west: flip(rects.east),
    north: flip(rects.north),
    south: flip(rects.south),
    up: flip(rects.up),
    down: flip(rects.down),
  };
}

/** three.js builds a box's faces in this order: +x, -x, +y, -y, +z, -z. */
const BOX_FACES: Face[] = ["east", "west", "up", "down", "south", "north"];

const euler = (r: V3 | undefined) =>
  new Euler(
    (-(r?.[0] ?? 0) * Math.PI) / 180,
    (-(r?.[1] ?? 0) * Math.PI) / 180,
    ((r?.[2] ?? 0) * Math.PI) / 180,
    "ZYX",
  );

/** Bedrock's pivot, mirrored into three.js space and scaled to world units. */
const point = (p: V3 | undefined): V3 => [-(p?.[0] ?? 0) * PX, (p?.[1] ?? 0) * PX, (p?.[2] ?? 0) * PX];

function cubeGeometry(cube: Cube, texW: number, texH: number) {
  const grow = (cube.inflate ?? 0) * 2;
  const [sx, sy, sz] = cube.size;
  const geo = new BoxGeometry((sx + grow) * PX, (sy + grow) * PX, (sz + grow) * PX);
  const rects = boxUV(cube.uv, cube.size, Boolean(cube.mirror));
  const uv = geo.getAttribute("uv");
  BOX_FACES.forEach((face, f) => {
    let [l, t, w, h] = rects[face];
    // seen from above, three.js puts north at the top of the top face; the
    // sheet puts it at the bottom, so the top is read upside down
    if (face === "up") [l, t, w, h] = [l + w, t + h, -w, -h];
    // three.js corners per face: top-left, top-right, bottom-left, bottom-right
    const corners: [number, number][] = [
      [l, t],
      [l + w, t],
      [l, t + h],
      [l + w, t + h],
    ];
    corners.forEach(([cu, cv], k) => uv.setXY(f * 4 + k, cu / texW, cv / texH));
  });
  uv.needsUpdate = true;
  return geo;
}

/**
 * The whole model, feet on y = 0, facing whichever way its author drew it.
 * Every box shares `material`; the geometries are the caller's to dispose of.
 */
export function buildGeo(geo: Geo, material: Material): Group {
  const { texture_width: texW, texture_height: texH } = geo.description;
  const root = new Group();
  const bones = new Map<string, { group: Group; pivot: V3 }>();

  // parents can come after their children in the file, so build first, hang after
  for (const bone of geo.bones) {
    const group = new Group();
    group.name = bone.name;
    group.rotation.copy(euler(bone.rotation));
    const pivot = point(bone.pivot);

    for (const cube of bone.cubes ?? []) {
      const [ox, oy, oz] = cube.origin;
      const [sx, sy, sz] = cube.size;
      // the box's centre in three.js space, before anything turns
      const centre: V3 = [-(ox + sx / 2) * PX, (oy + sy / 2) * PX, (oz + sz / 2) * PX];
      const mesh = new Mesh(cubeGeometry(cube, texW, texH), material);
      if (cube.rotation) {
        const cp = point(cube.pivot);
        const turn = new Group();
        turn.position.set(cp[0] - pivot[0], cp[1] - pivot[1], cp[2] - pivot[2]);
        turn.rotation.copy(euler(cube.rotation));
        mesh.position.set(centre[0] - cp[0], centre[1] - cp[1], centre[2] - cp[2]);
        turn.add(mesh);
        group.add(turn);
      } else {
        mesh.position.set(centre[0] - pivot[0], centre[1] - pivot[1], centre[2] - pivot[2]);
        group.add(mesh);
      }
    }
    bones.set(bone.name, { group, pivot });
  }

  for (const bone of geo.bones) {
    const { group, pivot } = bones.get(bone.name)!;
    const parent = bone.parent ? bones.get(bone.parent) : undefined;
    const base = parent?.pivot ?? [0, 0, 0];
    group.position.set(pivot[0] - base[0], pivot[1] - base[1], pivot[2] - base[2]);
    (parent?.group ?? root).add(group);
  }
  return root;
}
