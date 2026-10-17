import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  Box3,
  CanvasTexture,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type PointLight,
  type Texture,
} from "three";
import { buildGeo, type Geo } from "../lib/bedrock";
import { burn, moveMs, travel, type Move } from "../lib/descent";
import baseGeo from "../assets/rotom/cobblemon/rotom.geo.json";
import washGeo from "../assets/rotom/cobblemon/rotom_wash.geo.json";
import baseSkin from "../assets/rotom/cobblemon/rotom.png?url";
import baseGlow from "../assets/rotom/cobblemon/rotom_emissive.png?url";
import washSkin from "../assets/rotom/cobblemon/rotom_wash.png?url";
import washGlow from "../assets/rotom/cobblemon/rotom_wash_emissive.png?url";
import heatGeo from "../assets/rotom/cobblemon/rotom_heat.geo.json";
import heatSkin from "../assets/rotom/cobblemon/rotom_heat.png?url";
import heatGlow from "../assets/rotom/cobblemon/rotom_heat_emissive.png?url";

/*
 * The models are Cobblemon's (gitlab.com/cable-mc/cobblemon), under the
 * MPL-2.0. The credit is in README.md and `npm test` fails if it goes
 * missing. Each form is its own Bedrock model with its own pixel-art sheet
 * and a second sheet of the parts that glow.
 */

/** Which of its shapes it has taken. One per floor of the tower. */
export type RotomForm = "base" | "wash" | "heat";

const FORMS: Record<RotomForm, { geo: Geo; skin: string; glow: string; light: string }> = {
  base: { geo: baseGeo["minecraft:geometry"][0] as unknown as Geo, skin: baseSkin, glow: baseGlow, light: "#FFAE4A" },
  wash: { geo: washGeo["minecraft:geometry"][0] as unknown as Geo, skin: washSkin, glow: washGlow, light: "#8AD8FF" },
  heat: { geo: heatGeo["minecraft:geometry"][0] as unknown as Geo, skin: heatSkin, glow: heatGlow, light: "#FF7A2A" },
};

/**
 * The bones Cobblemon switches on and off as it animates: a closed and an
 * open mouth under the grin, and lids over the eyes. Left showing, they sit
 * on top of each other and the face is a mess. And the trail of light the
 * mod streams behind it as it flies, which standing still is only a long
 * stripe through the middle of it.
 */
const HIDDEN = /^(mouth_closed|mouth_open|eyelid_left|eyelid_right|light_trail\d*)$/;

/**
 * How wide the keeper's body stands, in world units, whatever it is wearing.
 * The body only: the arms of plasma reach out four times as far again.
 */
const TARGET_W = 0.6;

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

/**
 * One form, built and measured by its body alone: the washing machine trails
 * a cord, and measuring that too would shrink it and push it off centre.
 * Every form ends up the same size, in the same place.
 */
function buildForm(form: RotomForm, map: Texture, glowSheet: Texture) {
  crisp(map);
  const material = new MeshStandardMaterial({
    map,
    emissiveMap: glowOnly(glowSheet),
    emissive: "#ffffff",
    emissiveIntensity: 0.6,
    alphaTest: 0.5,
    roughness: 0.7,
  });
  const model = buildGeo(FORMS[form].geo, material);
  model.traverse((o) => {
    if (HIDDEN.test(o.name)) o.visible = false;
  });
  model.updateMatrixWorld(true);
  const body = new Box3();
  model.getObjectByName("body")?.children.forEach((o) => {
    if ((o as Mesh).isMesh) body.expandByObject(o);
  });
  const size = body.getSize(new Vector3());
  const mid = body.getCenter(new Vector3());
  return {
    material,
    model,
    scale: TARGET_W / Math.max(size.x, 0.01),
    offset: [-mid.x, -mid.y, -mid.z] as [number, number, number],
  };
}

const ORDER: RotomForm[] = ["base", "wash", "heat"];

/** The flames round it when it catches fire: an outer ring and an inner one. */
const TONGUES = [
  // the big outer flames, deep orange, all round it
  ...Array.from({ length: 8 }, (_, k) => ({ a: (k / 8) * Math.PI * 2, r: 0.34, w: 0.17, h: 1.0, color: "#FF5A14" })),
  // and the hotter, smaller yellow ones inside them
  ...Array.from({ length: 6 }, (_, k) => ({ a: ((k + 0.5) / 6) * Math.PI * 2, r: 0.24, w: 0.12, h: 0.7, color: "#FFC83A" })),
];

export default function Rotom({
  reduced,
  zapAt,
  awake,
  form,
  move,
  from,
  fire,
}: {
  reduced: boolean;
  /** Time of the last tap, in `performance.now()` ms. Drives the flinch. */
  zapAt: number;
  /** Calm once the way is open: it stops buzzing and just floats. */
  awake: boolean;
  form: RotomForm;
  /** On its way through the shaft, if it is. */
  move?: Move;
  /** The form it arrives in, before the flash turns it into `form`. */
  from?: RotomForm;
  /** Instead of the flash, it catches fire and changes behind the smoke. */
  fire?: boolean;
}) {
  const group = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  const camera = useThree((s) => s.camera);
  // every form's sheets at once: they are tiny, and a form changing mid-air
  // must not have to wait for its pictures
  const sheets = useLoader(
    TextureLoader,
    ORDER.flatMap((f) => [FORMS[f].skin, FORMS[f].glow]),
  );
  const forms = useMemo(
    () =>
      Object.fromEntries(
        ORDER.map((f, i) => [f, buildForm(f, sheets[i * 2], sheets[i * 2 + 1])]),
      ) as Record<RotomForm, ReturnType<typeof buildForm>>,
    [sheets],
  );
  useEffect(
    () => () => {
      for (const { model, material } of Object.values(forms)) {
        model.traverse((o) => (o as Mesh).geometry?.dispose());
        material.emissiveMap?.dispose();
        material.dispose();
      }
    },
    [forms],
  );

  /** What it looks like right now: `from` until the flash of an arrival peaks. */
  const arriving = move?.kind === "in" && from !== undefined && !reduced;
  /** Landing to catch fire, the first time into the machine room. */
  const burning = arriving && !!fire;
  const tongues = useRef<(Group | null)[]>([]);
  const clouds = useRef<(Mesh | null)[]>([]);
  const fireLight = useRef<PointLight>(null);
  const [shown, setShown] = useState<RotomForm>(arriving ? from : form);
  useEffect(() => setShown(arriving ? from : form), [arriving, from, form]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const now = performance.now();

    const p = move && !reduced ? (now - move.at) / moveMs(move.fast) : 1;
    const trip = move && !reduced ? travel(p, move.kind, move.dir) : { dy: 0, scale: 1, spin: 0, flash: 0 };
    // catching fire changes it behind the smoke, so it lands without the flash
    const blaze = burning ? burn(now - move!.at - moveMs(move!.fast)) : null;
    if (blaze) trip.flash = 0;
    if (arriving && (blaze ? blaze.swapped : p >= 0.525) && shown !== form) setShown(form);

    // face the camera, but only around y: a plasma ghost that rolls is a bug
    g.rotation.y =
      Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z) +
      FACING +
      trip.spin;

    const hit = Math.max(0, 1 - (now - zapAt) / 420);
    const jolt = reduced ? 0 : hit * hit;

    g.position.y = 1.12 + (reduced ? 0 : Math.sin(t * 1.6) * 0.06) - jolt * 0.09 + trip.dy;
    g.rotation.z = reduced ? 0 : Math.sin(t * 0.9) * 0.04 - jolt * 0.1;
    g.scale.set(
      (1 + jolt * 0.16) * trip.scale,
      (1 - jolt * 0.08) * trip.scale,
      (1 + jolt * 0.16) * trip.scale,
    );

    const buzz = reduced || !awake ? 0 : (Math.sin(t * 17) + 1) * 0.15;
    const heat = blaze?.heat ?? 0;
    const { material } = forms[shown];
    material.emissiveIntensity = 0.6 + buzz + jolt * 1.4 + trip.flash * 3 + heat * 1.6;
    // red-hot: the glow goes from white towards #FF3A10
    material.emissive.setRGB(1, 1 - heat * 0.77, 1 - heat * 0.94);
    g.position.x = blaze ? Math.sin(t * 70) * blaze.shake * 0.03 : 0;

    const flames = blaze?.flames ?? 0;
    tongues.current.forEach((tongue, k) => {
      if (!tongue) return;
      tongue.visible = flames > 0;
      const lick = 0.75 + 0.25 * Math.sin(t * (13 + k * 3) + k * 2);
      tongue.scale.set(flames, flames * lick, flames);
    });
    if (fireLight.current) fireLight.current.intensity = flames * (3 + Math.sin(t * 23) * 0.8);

    // the smoke it vanishes in; on the short way into the oven, a puff with the flash
    const puff = !burning && arriving && form === "heat" ? trip.flash * 0.6 : 0;
    const smoke = Math.max(blaze?.smoke ?? 0, puff);
    // once it has changed, the cloud lifts off it as it thins
    const lift = blaze?.swapped ? (1 - smoke) * 0.9 : 0;
    clouds.current.forEach((cloud, k) => {
      if (!cloud) return;
      cloud.visible = smoke > 0;
      const a = (k / clouds.current.length) * Math.PI * 2;
      const out = 0.18 + smoke * 0.22;
      cloud.position.set(Math.cos(a) * out, -0.15 + (k % 3) * 0.2 + lift + Math.sin(t * 2 + k) * 0.03, Math.sin(a) * out);
      cloud.scale.setScalar(0.18 + smoke * 0.2);
      (cloud.material as MeshBasicMaterial).opacity = smoke * 0.9;
    });

    if (flash.current) {
      flash.current.visible = trip.flash > 0;
      flash.current.scale.setScalar(0.4 + trip.flash * 1.1);
      (flash.current.material as MeshBasicMaterial).opacity = trip.flash * 0.85;
    }
  });

  const { model, scale, offset } = forms[shown];
  return (
    <group ref={group} position={[0, 1.12, 0]}>
      <group scale={scale}>
        <primitive object={model} position={offset} />
      </group>
      {/* the flash it changes form in: a burst of plasma, gone in a beat */}
      <mesh ref={flash} visible={false}>
        <sphereGeometry args={[0.6, 20, 14]} />
        <meshBasicMaterial
          color="#D8F6FF"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* the flames it catches fire in, licking up round it from below */}
      {TONGUES.map(({ a, r, w, h, color }, k) => (
        <group key={k} position={[Math.cos(a) * r, -0.36, Math.sin(a) * r]}>
          <group ref={(m) => void (tongues.current[k] = m)} visible={false}>
            {/* lifted by half its height, so it grows up from its base */}
            <mesh position={[0, h / 2, 0]}>
              <coneGeometry args={[w, h, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} blending={AdditiveBlending} />
            </mesh>
          </group>
        </group>
      ))}
      <pointLight ref={fireLight} position={[0, 0, 0.6]} color="#FF7A2A" intensity={0} distance={3} />
      {/* and the smoke that swallows it while it changes */}
      {Array.from({ length: 8 }, (_, k) => (
        <mesh key={k} ref={(m) => void (clouds.current[k] = m)} visible={false}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshBasicMaterial color="#4A4A4A" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {/* its own glow, out in front where it lights the face: from inside a
          body made of boxes it would only light the backs of their faces */}
      <pointLight color={FORMS[shown].light} intensity={6} distance={5} />
      <pointLight position={[0, 0.4, -1.4]} color="#FFF1DC" intensity={5} distance={4} />
    </group>
  );
}
