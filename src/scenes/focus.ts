import type { SectionId } from '../types';

/** Sections that get their own 3D close-up. The terminal stays a panel. */
export type FocusId = Exclude<SectionId, 'terminal'>;

/**
 * Where the camera stands for a given area.
 *
 * `azimuth` is measured the way OrbitControls measures it: 0 looks from +z,
 * +PI/2 looks from +x. `polar` is the angle from straight up, so PI/2 is eye
 * level and smaller values look down from higher up. `zoom` multiplies the
 * zoom that fits the whole room, so every view stays responsive.
 */
export type View = {
  target: [number, number, number];
  azimuth: number;
  polar: number;
  zoom: number;
  /** How far the visitor may still swing the camera once it has arrived. */
  spread: { azimuth: number; polar: number };
};

/**
 * Where the credits screen stands: outside the doorway, past the left wall,
 * facing away from the room. It has to be outside — a screen inside the room
 * would be hidden behind that wall from every angle the camera can reach.
 */
export const CREDITS_SCREEN: [number, number, number] = [-6.2, 1.5, 0.7];

/** How much freedom a close-up leaves: enough to look around, not to get lost. */
export const FOCUS_SPREAD = { azimuth: 0.34, polar: 0.2 };

/** The default near-isometric shot of the whole diorama. */
export const ROOM_VIEW: View = {
  target: [0, 0.9, 0],
  azimuth: Math.PI / 4,
  polar: 1.046,
  zoom: 1,
  spread: { azimuth: 0.5, polar: 0.29 },
};

/**
 * One close-up per area. Each camera has to end up on the side the object
 * actually faces: the bookshelf and the monitor face +z, the door faces +x.
 */
export const FOCUS_VIEWS: Record<FocusId, View> = {
  /* the case is 2.27 tall now, so the shot is centred higher up */
  exams: { target: [2.05, 1.2, -2.15], azimuth: 0.3, polar: 1.3, zoom: 2.3, spread: FOCUS_SPREAD },
  projects: {
    target: [-1.35, 1.5, -2.15],
    azimuth: 0.24,
    polar: 1.34,
    zoom: 3.1,
    spread: FOCUS_SPREAD,
  },
  thesis: { target: [1.75, 1.8, 0.95], azimuth: 0.85, polar: 1.2, zoom: 2.2, spread: FOCUS_SPREAD },
  /* the only view that leaves the room: through the door, in front of the
     screen, looking back at it from the far side. */
  credits: {
    target: CREDITS_SCREEN,
    azimuth: -Math.PI / 2,
    polar: Math.PI / 2,
    zoom: 2.1,
    spread: { azimuth: 0.16, polar: 0.1 },
  },
};

/** Seconds the camera takes to fly between two views. */
export const FLIGHT = 0.9;
