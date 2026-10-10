"use client";
import { useEffect, useState } from "react";
import CampusMap, { MapBuilding } from "./CampusMap";

const BASE = [
  { id: "hostel-a", name: "Hostel block A", kind: "hostel", level: 78 },
  { id: "hostel-b", name: "Hostel block B", kind: "hostel", level: 62 },
  { id: "hostel-c", name: "Hostel block C", kind: "hostel", level: 70 },
  { id: "library", name: "Library", kind: "library", level: 71 },
  { id: "mess", name: "Mess", kind: "mess", level: 58 },
  { id: "academic", name: "Academic block", kind: "academic", level: 66 },
];

const CAPTIONS: [number, string][] = [
  [0, "All tanks normal"],
  [5, "Detect: block B outflow is far above its baseline"],
  [7, "Investigate: readings, water balance, pump, schedule"],
  [9, "Decide and act: close valve V2, alert staff"],
  [12, "Verify: outflow is back to baseline"],
  [13, "Incident stabilized"],
  [16, "All tanks normal"],
];

/** A looping, scripted version of the incident. It runs without any backend. */
export default function HeroMap() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => (x + 1) % 18), 1000);
    return () => clearInterval(id);
  }, []);

  const buildings: MapBuilding[] = BASE.map((b, i) => {
    let level = b.level + Math.sin((t + i * 2) / 3) * 1.2;
    let alert: MapBuilding["alert"] = null;
    let fixed = false;
    let valveClosed = false;
    if (b.id === "hostel-b") {
      if (t >= 5 && t < 13) {
        level = 62 - Math.min(t - 5, 6) * 3.2;
        alert = "leak";
        valveClosed = t >= 10;
      } else if (t >= 13 && t < 16) {
        level = 44;
        fixed = true;
        valveClosed = true;
      }
    }
    return { ...b, level, alert, fixed, valveClosed, flush: false };
  });

  const caption = [...CAPTIONS].reverse().find(([from]) => t >= from)?.[1];
  return <CampusMap buildings={buildings} caption={caption} />;
}
