"use client";

import { useEffect, useRef, useState } from "react";

export type Zone = "back" | "forward" | "books" | "search" | "home";

type MousePosition = {
  x: number;
  y: number;
};

type NearbyZone = {
  zone: Zone;
  direction: string;
};

type MouseZoneState = {
  currentZone: Zone;
  previousZone: Zone | null;
  mousePosition: MousePosition;
  isIdle: boolean;
  nearbyZones: NearbyZone[];
};

const IDLE_DELAY_MS = 800;

const ZONE_CENTERS: Record<Zone, { x: number; y: number }> = {
  back: { x: 25, y: 25 },
  forward: { x: 75, y: 25 },
  books: { x: 17.5, y: 75 },
  search: { x: 82.5, y: 75 },
  home: { x: 50, y: 85 },
};

const NEARBY_ZONE_MAP: Record<Zone, NearbyZone[]> = {
  back: [
    { zone: "forward", direction: "right" },
    { zone: "books", direction: "down" },
  ],
  forward: [
    { zone: "back", direction: "left" },
    { zone: "search", direction: "down" },
  ],
  books: [
    { zone: "home", direction: "right" },
    { zone: "back", direction: "up" },
  ],
  search: [
    { zone: "home", direction: "left" },
    { zone: "forward", direction: "up" },
  ],
  home: [
    { zone: "books", direction: "left" },
    { zone: "search", direction: "right" },
  ],
};

const DEFAULT_STATE: MouseZoneState = {
  currentZone: "home",
  previousZone: null,
  mousePosition: { x: 0, y: 0 },
  isIdle: false,
  nearbyZones: NEARBY_ZONE_MAP.home,
};

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getNearestZone(xPercent: number, yPercent: number): Zone {
  return (Object.entries(ZONE_CENTERS) as Array<[Zone, { x: number; y: number }]>)
    .reduce<{ zone: Zone; distance: number } | null>((closest, [zone, center]) => {
      const distance = getDistance({ x: xPercent, y: yPercent }, center);

      if (!closest || distance < closest.distance) {
        return { zone, distance };
      }

      return closest;
    }, null)
    ?.zone ?? "home";
}

export function getZone(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
): Zone {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return "home";
  }

  const xPercent = (x / viewportWidth) * 100;
  const yPercent = (y / viewportHeight) * 100;

  if (yPercent < 50) {
    return xPercent < 50 ? "back" : "forward";
  }

  if (xPercent < 35) {
    return "books";
  }

  if (xPercent >= 65) {
    return "search";
  }

  if (yPercent >= 70) {
    return "home";
  }

  return getNearestZone(xPercent, yPercent);
}

export function getNearbyZones(zone: Zone): NearbyZone[] {
  return NEARBY_ZONE_MAP[zone];
}

export function useMouseZone(): MouseZoneState {
  const [state, setState] = useState<MouseZoneState>(DEFAULT_STATE);
  const frameRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);
  const latestPositionRef = useRef<MousePosition>(DEFAULT_STATE.mousePosition);
  const currentZoneRef = useRef<Zone>(DEFAULT_STATE.currentZone);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clearIdleTimeout = () => {
      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current);
      }
    };

    const processMouseMove = () => {
      frameRef.current = null;

      const nextPosition = latestPositionRef.current;
      const nextZone = getZone(
        nextPosition.x,
        nextPosition.y,
        window.innerWidth,
        window.innerHeight,
      );

      setState((previousState) => {
        const zoneChanged = previousState.currentZone !== nextZone;
        const positionChanged =
          previousState.mousePosition.x !== nextPosition.x ||
          previousState.mousePosition.y !== nextPosition.y;
        const wasIdle = previousState.isIdle;

        currentZoneRef.current = nextZone;

        if (!zoneChanged && !positionChanged && !wasIdle) {
          return previousState;
        }

        return {
          currentZone: nextZone,
          previousZone: zoneChanged
            ? previousState.currentZone
            : previousState.previousZone,
          mousePosition: positionChanged ? nextPosition : previousState.mousePosition,
          isIdle: false,
          nearbyZones: zoneChanged
            ? getNearbyZones(nextZone)
            : previousState.nearbyZones,
        };
      });
    };

    const scheduleIdleState = () => {
      clearIdleTimeout();
      idleTimeoutRef.current = window.setTimeout(() => {
        setState((previousState) => {
          if (previousState.isIdle) {
            return previousState;
          }

          return {
            ...previousState,
            isIdle: true,
          };
        });
      }, IDLE_DELAY_MS);
    };

    const handleMouseMove = (event: MouseEvent) => {
      latestPositionRef.current = { x: event.clientX, y: event.clientY };

      scheduleIdleState();

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(processMouseMove);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearIdleTimeout();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return state;
}
