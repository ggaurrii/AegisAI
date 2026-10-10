"use client";
import type { CSSProperties } from "react";
import { useId } from "react";

export interface MapBuilding {
  id: string;
  name: string;
  kind: string;
  level: number;
  alert: "leak" | "overflow" | null;
  fixed: boolean;
  valveClosed: boolean;
  flush: boolean;
}

// Isometric projection helpers. Every building is drawn around its screen-space centre.
const S = 38;
const CX = 0.866 * S;
const CY = 0.5 * S;
const ZS = 34;
const W = 2.2;
const H2 = W / 2;
const MAIN_Y = 330;
const RX = 22;
const RY = 12.6;
const TH = 40;

const LAYOUT: Record<string, [number, number]> = {
  "hostel-a": [-200, 0],
  "hostel-b": [0, 0],
  "hostel-c": [200, 0],
  library: [-100, 240],
  mess: [100, 240],
  academic: [300, 240],
};
const HEIGHT: Record<string, number> = { hostel: 2.3, library: 1.7, mess: 1.5, academic: 1.9 };
const FACE = { top: "#1a4c5e", left: "#0c3140", right: "#103c4b", edge: "#2a6578" };

type Pt = [number, number];
const pts = (ps: Pt[]) => ps.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
const hash = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

function proj(sx: number, sy: number) {
  return (dx: number, dy: number, z = 0): Pt => [sx + (dx - dy) * CX, sy + (dx + dy) * CY - z * ZS];
}

function Windows({ id, sx, sy, h, face }: { id: string; sx: number; sy: number; h: number; face: "left" | "right" }) {
  const P = proj(sx, sy);
  const rows = Math.max(2, Math.round(h / 0.75));
  const cols = 3;
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = 0.12 + c * (0.76 / cols) + 0.04;
      const u1 = 0.12 + (c + 1) * (0.76 / cols) - 0.04;
      const v0 = 0.12 + r * (0.74 / rows) + 0.05;
      const v1 = 0.12 + (r + 1) * (0.74 / rows) - 0.05;
      const at = (u: number, v: number): Pt =>
        face === "right" ? P(H2, -H2 + u * W, v * h) : P(-H2 + u * W, H2, v * h);
      const lit = (hash(id) + c * 7 + r * 13 + (face === "right" ? 3 : 0)) % 5 < 2;
      out.push(
        <polygon key={`${face}${r}${c}`} points={pts([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)])}
          fill={lit ? "#ffd98a" : "#08222d"} opacity={lit ? 0.85 : 0.9} />,
      );
    }
  }
  return <>{out}</>;
}

function Building({ b, uid, selected, onSelect }: { b: MapBuilding; uid: string; selected: boolean; onSelect?: (id: string) => void }) {
  const [sx, sy] = LAYOUT[b.id];
  const h = HEIGHT[b.kind] ?? 1.8;
  const P = proj(sx, sy);
  const top: Pt[] = [P(-H2, -H2, h), P(H2, -H2, h), P(H2, H2, h), P(-H2, H2, h)];
  const right: Pt[] = [P(H2, -H2, 0), P(H2, H2, 0), P(H2, H2, h), P(H2, -H2, h)];
  const left: Pt[] = [P(-H2, H2, 0), P(H2, H2, 0), P(H2, H2, h), P(-H2, H2, h)];
  const pad: Pt[] = [P(-1.45, -1.45), P(1.45, -1.45), P(1.45, 1.45), P(-1.45, 1.45)];
  const [bx, by] = P(0, 0, h);
  const frontY = sy + W * CY;
  const pct = Math.max(0, Math.min(100, b.level));
  const off = (1 - pct / 100) * TH;
  const clip = `${uid}-${b.id}`;
  const body = `M${bx - RX},${by - TH} L${bx - RX},${by} A${RX},${RY} 0 0 0 ${bx + RX},${by} L${bx + RX},${by - TH} Z`;
  const edge = b.alert ? "var(--coral)" : b.fixed ? "var(--kelp)" : FACE.edge;
  const badge = b.alert === "leak" ? "Leak" : b.alert === "overflow" ? "Overflow" : b.fixed ? "Fixed" : b.flush ? "Flush" : null;
  const badgeColor = b.alert ? "var(--coral)" : b.fixed ? "var(--kelp)" : "var(--amber)";
  const [dx, dy] = P(H2, H2, h * 0.35);

  return (
    <g
      className={`bld${selected ? " selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${b.name}, tank ${Math.round(pct)} percent${b.alert ? `, ${b.alert} detected` : ""}`}
      onClick={() => onSelect?.(b.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(b.id);
        }
      }}
    >
      <polygon points={pts(pad)} fill="#0b3140" stroke="#154558" strokeWidth="1" />
      <polygon className="sel-ring" points={pts(pad)} fill="none" stroke="var(--lagoon)" strokeWidth="2.5" />

      <polygon points={pts(left)} fill={FACE.left} stroke={FACE.edge} strokeWidth="1" strokeLinejoin="round" />
      <polygon points={pts(right)} fill={FACE.right} stroke={FACE.edge} strokeWidth="1" strokeLinejoin="round" />
      <Windows id={b.id} sx={sx} sy={sy} h={h} face="left" />
      <Windows id={b.id} sx={sx} sy={sy} h={h} face="right" />
      <polygon points={pts(top)} fill={FACE.top} stroke={edge} strokeWidth={b.alert || b.fixed ? 2.2 : 1} strokeLinejoin="round" />

      {b.alert === "overflow" && (
        <ellipse className="puddle" cx={bx + 6} cy={by + RY - 3} rx={RX + 10} ry={RY - 1} fill="var(--lagoon)" opacity="0.4" />
      )}

      <defs>
        <clipPath id={clip}>
          <path d={body} />
          <ellipse cx={bx} cy={by - TH} rx={RX} ry={RY} />
        </clipPath>
      </defs>
      <ellipse cx={bx} cy={by - TH} rx={RX} ry={RY} fill="#061c27" />
      <path d={body} fill="#0a2a37" />
      <g clipPath={`url(#${clip})`}>
        <g style={{ transform: `translateY(${off}px)`, transition: "transform 1.2s cubic-bezier(.3,.7,.2,1)" }}>
          <rect x={bx - RX} y={by - TH} width={RX * 2} height={TH + RY + 6} fill={`url(#${uid}wg)`} />
          <ellipse className="surface" cx={bx} cy={by - TH} rx={RX} ry={RY} fill="#6fe6dc" opacity="0.9" />
        </g>
      </g>
      <path d={body} fill="none" stroke="#3d7f92" strokeWidth="1.5" />
      <ellipse cx={bx} cy={by - TH} rx={RX} ry={RY} fill="none" stroke="#5aa3b6" strokeWidth="1.5" />
      <path d={`M${bx - RX + 5},${by - TH + 6} L${bx - RX + 5},${by - 4}`} stroke="#fff" strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" />

      {b.alert && <ellipse className="ring" cx={bx} cy={by} rx={RX + 10} ry={RY + 6} fill="none" stroke="var(--coral)" strokeWidth="2.2" />}

      {b.alert === "leak" && (
        <g>
          <ellipse className="puddle" cx={sx} cy={frontY + 4} rx={16} ry={5} fill="var(--lagoon)" opacity="0.5" />
          {[0, 1, 2].map((i) => (
            <circle key={i} className="drip" cx={dx + (i - 1) * 3} cy={dy} r={2.4} fill="var(--lagoon)" style={{ animationDelay: `${i * 0.37}s` }} />
          ))}
        </g>
      )}
      {b.alert === "overflow" &&
        [0, 1, 2].map((i) => (
          <circle key={i} className="drip" cx={bx + RX + 2 + i * 2} cy={by - TH + 8} r={2.4} fill="var(--lagoon)" style={{ animationDelay: `${i * 0.33}s` }} />
        ))}

      {badge && (
        <g>
          <rect x={bx - 36} y={by - TH - RY - 36} width="72" height="23" rx="11.5" fill="#05171f" stroke={badgeColor} strokeWidth="1.3" />
          <text x={bx} y={by - TH - RY - 20} textAnchor="middle" fontSize="14" fontWeight="600" fill={badgeColor}>
            {badge}
          </text>
        </g>
      )}

      <text x={sx + 14} y={frontY + 17} fontSize="16" fontWeight="500" fill="var(--foam)">
        {b.name}
      </text>
      <text x={sx + 14} y={frontY + 36} fontSize="14.5" fill={b.alert ? "var(--coral)" : "var(--mist)"}>
        {Math.round(pct)}% full{b.valveClosed ? ", valve closed" : ""}
      </text>
    </g>
  );
}

function Branch({ b }: { b: MapBuilding }) {
  const [sx, sy] = LAYOUT[b.id];
  const frontY = sy + W * CY;
  const vy = frontY + 26;
  const leaking = b.alert === "leak" && !b.valveClosed;
  const color = b.valveClosed ? "#3b6475" : leaking ? "var(--coral)" : "var(--lagoon)";
  const style = { "--d": leaking ? "0.45s" : "1.8s", animationPlayState: b.valveClosed ? "paused" : "running" } as CSSProperties;
  return (
    <g>
      <line x1={sx} y1={MAIN_Y} x2={sx} y2={frontY} stroke="#10394a" strokeWidth="8" strokeLinecap="round" />
      <line className="flow" x1={sx} y1={MAIN_Y} x2={sx} y2={frontY} stroke={color} strokeWidth="2.2" style={style} />
      <circle cx={sx} cy={vy} r="6.5" fill={b.valveClosed ? "var(--coral)" : "#082530"} stroke={b.valveClosed ? "var(--coral)" : "var(--kelp)"} strokeWidth="2" />
      {b.valveClosed && <line x1={sx - 3.5} x2={sx + 3.5} y1={vy} y2={vy} stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
    </g>
  );
}

export default function CampusMap({
  buildings,
  selectedId,
  onSelect,
  caption,
}: {
  buildings: MapBuilding[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  caption?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const known = buildings.filter((b) => LAYOUT[b.id]);
  const ordered = [...known].sort((a, c) => LAYOUT[a.id][1] - LAYOUT[c.id][1] || LAYOUT[a.id][0] - LAYOUT[c.id][0]);
  const PP = proj(-310, 293);
  const pump: Pt[][] = [
    [PP(-0.6, 0.6, 0), PP(0.6, 0.6, 0), PP(0.6, 0.6, 0.8), PP(-0.6, 0.6, 0.8)],
    [PP(0.6, -0.6, 0), PP(0.6, 0.6, 0), PP(0.6, 0.6, 0.8), PP(0.6, -0.6, 0.8)],
    [PP(-0.6, -0.6, 0.8), PP(0.6, -0.6, 0.8), PP(0.6, 0.6, 0.8), PP(-0.6, 0.6, 0.8)],
  ];

  return (
    <div className="map-wrap">
      <svg viewBox="-395 -215 925 625" role="group" aria-label="Isometric map of the campus water network">
        <defs>
          <linearGradient id={`${uid}wg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#45d9cf" />
            <stop offset="1" stopColor="#0b6f7c" />
          </linearGradient>
        </defs>
        <rect x="-385" y="-72" width="905" height="470" rx="40" fill="#061f2a" />
        <rect x="-385" y="-86" width="905" height="470" rx="40" fill="#082a37" stroke="#123f50" strokeWidth="1" />

        {/* main supply pipe */}
        <line x1="-275" y1={MAIN_Y} x2="360" y2={MAIN_Y} stroke="#10394a" strokeWidth="9" strokeLinecap="round" />
        <line className="flow" x1="-275" y1={MAIN_Y} x2="360" y2={MAIN_Y} stroke="var(--lagoon)" strokeWidth="2.4" />
        {known.map((b) => (
          <Branch key={b.id} b={b} />
        ))}

        {/* pump station */}
        <polygon points={pts(pump[0])} fill="#0c3140" stroke={FACE.edge} />
        <polygon points={pts(pump[1])} fill="#103c4b" stroke={FACE.edge} />
        <polygon points={pts(pump[2])} fill="#1a4c5e" stroke={FACE.edge} />
        <text x="-310" y="363" textAnchor="middle" fontSize="14" fill="var(--mist)">
          Main supply
        </text>

        {ordered.map((b) => (
          <Building key={b.id} b={b} uid={uid} selected={selectedId === b.id} onSelect={onSelect} />
        ))}
      </svg>
      {caption && <div className="map-caption" aria-live="polite">{caption}</div>}
    </div>
  );
}
