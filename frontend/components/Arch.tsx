const NODES: { x: number; y: number; label: string; sub: string }[] = [
  { x: 10, y: 24, label: "Next.js app", sub: "dashboard, student view" },
  { x: 250, y: 24, label: "API Gateway", sub: "HTTP API" },
  { x: 490, y: 24, label: "Lambda: api", sub: "all routes" },
  { x: 730, y: 24, label: "DynamoDB", sub: "4 tables" },
  { x: 10, y: 124, label: "EventBridge", sub: "every minute" },
  { x: 250, y: 124, label: "Lambda: heartbeat", sub: "advance, detect" },
  { x: 490, y: 124, label: "Lambda: agent", sub: "one incident each" },
  { x: 730, y: 124, label: "Bedrock + Strands", sub: "Claude picks the tools" },
  { x: 490, y: 220, label: "SNS", sub: "staff alerts" },
];

const ARROWS: [number, number, number, number][] = [
  [180, 48, 250, 48],
  [420, 48, 490, 48],
  [660, 48, 730, 48],
  [180, 148, 250, 148],
  [420, 148, 490, 148],
  [660, 148, 730, 148],
  [545, 72, 545, 124],
  [610, 172, 610, 220],
];

export default function Arch() {
  return (
    <svg viewBox="0 0 940 290" width="100%" role="img" aria-label="Architecture: the app calls API Gateway and a Lambda over DynamoDB; EventBridge runs a heartbeat that hands incidents to an agent Lambda using Bedrock and SNS.">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1L8 5L1 9" fill="none" stroke="var(--mist)" strokeWidth="1.6" strokeLinecap="round" />
        </marker>
      </defs>
      {ARROWS.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--mist)" strokeWidth="1.5" markerEnd="url(#ah)" />
      ))}
      <text x="553" y="104" fontSize="11" fill="var(--mute)">async invoke</text>
      {NODES.map((n) => (
        <g key={n.label}>
          <rect x={n.x} y={n.y} width="170" height="48" rx="10" fill="var(--panel)" stroke="var(--line)" />
          <text x={n.x + 85} y={n.y + 21} textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foam)">{n.label}</text>
          <text x={n.x + 85} y={n.y + 38} textAnchor="middle" fontSize="11.5" fill="var(--mist)">{n.sub}</text>
        </g>
      ))}
    </svg>
  );
}
