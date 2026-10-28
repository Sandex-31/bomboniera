import { useRef } from "react";
import { PerformanceMonitor } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

/** The sharpest every canvas draws, on a screen dense enough to show it. */
export const DPR: [number, number] = [1, 1.75];

/** Fired from a canvas once its scene has really been drawn a few times. */
export const DRAWN = "drawn";

/**
 * What every canvas does to stay smooth on a slow machine. It trades
 * sharpness for frame rate: when the frames sag the scene is drawn at fewer
 * pixels — under 1 on a machine that really struggles — and sharpens back up
 * once it keeps up again, so a fast machine never notices. And it says when
 * the scene has been drawn, so whatever is hiding the stall of building it
 * knows when it can stop.
 */
export function Steady() {
  const setDpr = useThree((s) => s.setDpr);
  const canvas = useThree((s) => s.gl.domElement);
  const most = Math.min(DPR[1], window.devicePixelRatio || 1);

  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 3) canvas.dispatchEvent(new Event(DRAWN, { bubbles: true }));
  });

  return (
    <PerformanceMonitor
      // start sharp and only give it up when the frames say so
      factor={1}
      onChange={({ factor }) => setDpr(Math.round((0.6 + (most - 0.6) * factor) * 20) / 20)}
    />
  );
}
