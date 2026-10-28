import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Spherical, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { FLIGHT, type View } from "./focus";

/** Distance the camera keeps from its target. Orthographic, so it only sets angle. */
const FLY_RADIUS = 18;

/** How many times closer than its view a zoomable rig lets the camera come. */
const ZOOM_IN = 2.5;

/**
 * Flies the camera between one view and the next.
 *
 * The controls are switched off for the duration, which also stops drei from
 * running `update()` — otherwise its angle clamps would fight the flight and
 * the camera would arrive somewhere else.
 *
 * Shared by both rooms: the room and whatever is through the portal move at
 * the same pace and settle the same way, which is most of what makes the two
 * feel like one place.
 */
export default function CameraRig({
  view,
  controls,
  reduced,
  onFlight,
  fit: [fitW, fitH],
  zoomable,
}: {
  view: View;
  controls: RefObject<OrbitControlsImpl | null>;
  reduced: boolean;
  onFlight: (flying: boolean) => void;
  /**
   * Projected size of what must stay in frame, in world units. A tall phone
   * needs a much wider zoom-out than a desktop window, so every view's zoom is
   * a multiple of the zoom that fits this box rather than an absolute number.
   */
  fit: [number, number];
  /**
   * Whether a pinch or the wheel may bring the camera closer than the view,
   * up to ZOOM_IN times. Never further out: the view is already everything
   * there is. Left out, the controls keep whatever limits they were given.
   */
  zoomable?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const fit = Math.min(size.width / fitW, size.height / fitH);
  const fitRef = useRef(fit);

  const goal = useMemo(() => {
    const target = new Vector3(...view.target);
    return {
      target,
      position: new Vector3()
        .setFromSphericalCoords(FLY_RADIUS, view.polar, view.azimuth)
        .add(target),
      azimuth: view.azimuth,
      polar: view.polar,
      zoom: view.zoom,
    };
  }, [view]);

  const trip = useRef<{
    t: number;
    fromTarget: Vector3;
    fromAzimuth: number;
    toAzimuth: number;
    fromPolar: number;
    fromZoom: number;
  } | null>(null);
  const first = useRef(true);

  /*
   * The new view's angle limits reach the controls the moment React commits,
   * and the effect below can let a frame through before the flight takes
   * over. In that frame the controls would clamp the camera — still standing
   * at the old view — into the new view's limits, a visible jump, and the
   * flight would set off from the clamped spot. A layout effect runs before
   * any frame, so the controls are switched off here. (Only off: on the very
   * first view the controls are not attached yet, which is why the flight
   * itself still starts in the ordinary effect.)
   */
  useLayoutEffect(() => {
    const c = controls.current;
    if (c && !first.current && !reduced) c.enabled = false;
  }, [goal, controls, reduced]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;

    if (first.current || reduced) {
      first.current = false;
      trip.current = null;
      camera.position.copy(goal.position);
      c.target.copy(goal.target);
      camera.zoom = fitRef.current * goal.zoom;
      camera.updateProjectionMatrix();
      c.update();
      onFlight(false);
      return;
    }

    const offset = camera.position.clone().sub(c.target);
    const from = new Spherical().setFromVector3(offset);
    trip.current = {
      t: 0,
      fromTarget: c.target.clone(),
      fromAzimuth: from.theta,
      /* the same direction by the short way round: an angle and the same
         angle plus a turn are one view, but flying between them is a spin */
      toAzimuth:
        from.theta +
        Math.atan2(Math.sin(goal.azimuth - from.theta), Math.cos(goal.azimuth - from.theta)),
      fromPolar: from.phi,
      fromZoom: camera.zoom,
    };
    onFlight(true);
  }, [goal, camera, controls, reduced, onFlight]);

  // the zoom limits follow the view, and the fit that sizes it
  useEffect(() => {
    const c = controls.current;
    if (!c || !zoomable) return;
    c.minZoom = fit * goal.zoom;
    c.maxZoom = fit * goal.zoom * ZOOM_IN;
  }, [fit, goal.zoom, zoomable, controls]);

  // a resize re-fits the zoom, but must not interrupt a flight in progress
  useEffect(() => {
    fitRef.current = fit;
    if (trip.current) return;
    camera.zoom = fit * goal.zoom;
    camera.updateProjectionMatrix();
  }, [fit, goal.zoom, camera]);

  useFrame((_, delta) => {
    const c = controls.current;
    const t = trip.current;
    if (!c || !t) return;

    t.t = Math.min(1, t.t + delta / FLIGHT);
    const e = t.t < 0.5 ? 2 * t.t * t.t : 1 - Math.pow(-2 * t.t + 2, 2) / 2;

    // The camera swings around on an arc and stays aimed at whatever it is
    // travelling toward. Interpolating the position in a straight line instead
    // would cut across the room, and nothing would re-aim the camera on the
    // way — OrbitControls owns lookAt, and it is off during the flight.
    c.target.lerpVectors(t.fromTarget, goal.target, e);
    camera.position
      .setFromSphericalCoords(
        FLY_RADIUS,
        t.fromPolar + (goal.polar - t.fromPolar) * e,
        t.fromAzimuth + (t.toAzimuth - t.fromAzimuth) * e,
      )
      .add(c.target);
    camera.lookAt(c.target);

    // Zoom is a scale, so it moves geometrically: each step of the flight
    // changes the picture by the same factor instead of lurching at one end.
    camera.zoom = t.fromZoom * Math.pow((fitRef.current * goal.zoom) / t.fromZoom, e);
    camera.updateProjectionMatrix();

    if (t.t >= 1) {
      trip.current = null;
      c.update();
      onFlight(false);
    }
  });

  return null;
}
