import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Box3,
  CanvasTexture,
  MeshStandardMaterial,
  NearestFilter,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type Texture,
} from "three";
import { buildGeo, type Geo } from "../lib/bedrock";
import baseGeo from "../assets/rotom/cobblemon/rotom.geo.json";
import washGeo from "../assets/rotom/cobblemon/rotom_wash.geo.json";
import baseSkin from "../assets/rotom/cobblemon/rotom.png?url";
import baseGlow from "../assets/rotom/cobblemon/rotom_emissive.png?url";
import washSkin from "../assets/rotom/cobblemon/rotom_wash.png?url";
import washGlow from "../assets/rotom/cobblemon/rotom_wash_emissive.png?url";

/*
 * The models are Cobblemon's (gitlab.com/cable-mc/cobblemon), under the
 * MPL-2.0. The credit is in README.md and `npm test` fails if it goes
 * missing. Each form is its own Bedrock model with its own pixel-art sheet
 * and a second sheet of the parts that glow.
 */

/** Which of its shapes it has taken. One per floor of the tower. */
export type RotomForm = "base" | "wash";

const FORMS: Record<RotomForm, { geo: Geo; skin: string; glow: string; light: string }> = {
  base: { geo: baseGeo["minecraft:geometry"][0] as unknown as Geo, skin: baseSkin, glow: baseGlow, light: "#FFAE4A" },
  wash: { geo: washGeo["minecraft:geometry"][0] as unknown as Geo, skin: washSkin, glow: washGlow, light: "#8AD8FF" },
};

/**
 * The bones Cobblemon switches on and off as it animates: a closed and an
 * open mouth under the grin, and lids over the eyes. Left showing, they sit
 * on top of each other and the face is a mess.
 */
const HIDDEN = ["mouth_closed", "mouth_open", "eyelid_left", "eyelid_right"];

/**
 * How wide the keeper's body stands, in world units, whatever it is wearing.
 * The body only: the arms of plasma reach out four times as far again.
 */
const TARGET_W = 0.8;

/**
 * Which way the model faces once built. Cobblemon draws its Pokémon looking
 * down -z, and the turn below points +z at the camera, hence half a turn.
 * The one number to change if it ever turns its back on the visitor.
 */
const FACING = Math.PI;

/** Pixel art, so no smoothing: a blurred sheet turns the face to mush. */
function crisp(t: Texture) {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
}

/**
 * The glow sheet as Cobblemon means it: an overlay drawn only where it is
 * opaque. Its see-through pixels still carry colour, and an emissive map
 * reads colour and ignores alpha, so left alone they lit the whole body pale
 * blue. Weighting every pixel by its alpha blacks them out.
 */
function glowOnly(t: Texture) {
  const img = t.image as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, img.width, img.height);
  for (let i = 0; i < px.data.length; i += 4) {
    const a = px.data[i + 3] / 255;
    px.data[i] *= a;
    px.data[i + 1] *= a;
    px.data[i + 2] *= a;
    px.data[i + 3] = 255;
  }
  ctx.putImageData(px, 0, 0);
  const out = new CanvasTexture(canvas);
  crisp(out);
  return out;
}

export default function Rotom({
  reduced,
  zapAt,
  awake,
  form,
}: {
  reduced: boolean;
  /** Time of the last tap, in `performance.now()` ms. Drives the flinch. */
  zapAt: number;
  /** Calm once the way is open: it stops buzzing and just floats. */
  awake: boolean;
  form: RotomForm;
}) {
  const group = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const { geo, skin, glow, light } = FORMS[form];
  const [map, glowSheet] = useLoader(TextureLoader, [skin, glow]);

  const material = useMemo(() => {
    crisp(map);
    return new MeshStandardMaterial({
      map,
      emissiveMap: glowOnly(glowSheet),
      emissive: "#ffffff",
      emissiveIntensity: 0.6,
      alphaTest: 0.5,
      roughness: 0.7,
    });
  }, [map, glowSheet]);

  /**
   * Built once per form, then measured by its body alone: the washing machine
   * trails a cord, and measuring that too would shrink it and push it off
   * centre. Every form ends up the same size, in the same place.
   */
  const { model, scale, offset } = useMemo(() => {
    const model = buildGeo(geo, material);
    for (const name of HIDDEN) {
      const bone = model.getObjectByName(name);
      if (bone) bone.visible = false;
    }
    model.updateMatrixWorld(true);
    const body = new Box3();
    model.getObjectByName("body")?.children.forEach((o) => {
      if ((o as Mesh).isMesh) body.expandByObject(o);
    });
    const size = body.getSize(new Vector3());
    const mid = body.getCenter(new Vector3());
    return {
      model,
      scale: TARGET_W / Math.max(size.x, 0.01),
      offset: [-mid.x, -mid.y, -mid.z] as [number, number, number],
    };
  }, [geo, material]);

  useEffect(
    () => () => {
      model.traverse((o) => (o as Mesh).geometry?.dispose());
      material.emissiveMap?.dispose();
      material.dispose();
    },
    [model, material],
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

    const buzz = reduced || !awake ? 0 : (Math.sin(t * 17) + 1) * 0.15;
    material.emissiveIntensity = 0.6 + buzz + jolt * 1.4;
  });

  return (
    <group ref={group} position={[0, 1.12, 0]}>
      <group scale={scale}>
        <primitive object={model} position={offset} />
      </group>
      {/* its own glow, out in front where it lights the face: from inside a
          body made of boxes it would only light the backs of their faces */}
      <pointLight color={light} intensity={6} distance={5} />
      <pointLight position={[0, 0.4, -1.4]} color="#FFF1DC" intensity={5} distance={4} />
    </group>
  );
}
