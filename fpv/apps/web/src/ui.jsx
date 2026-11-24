// Shared UI: drone illustration, icon set (Lucide), status badges.
import {
  Frame, Fan, Cpu, Antenna, Camera, Radio, Wind, BatteryFull, Gamepad2, Glasses, Zap, Wrench, Package,
  Route, Layers, BookOpen, ShieldCheck, Warehouse, Hammer, Terminal, ShoppingCart, Sparkles, Check, X,
  AlertTriangle, Gauge, Timer, Scale, Copy, Save, Trash2, MessageCircle, Send, Plus, ArrowLeft, Info, RotateCcw, CircleCheck,
} from "lucide-react";

const MAP = {
  frame: Frame, motor: Fan, stack: Cpu, vtx: Antenna, camera: Camera, rx: Radio, props: Wind, battery: BatteryFull,
  radio: Gamepad2, goggles: Glasses, charger: Zap, tools: Wrench, bnf: Package,
  route: Route, build: Layers, learn: BookOpen, safety: ShieldCheck, hangar: Warehouse, guide: Hammer, betaflight: Terminal,
  cart: ShoppingCart, tutor: Sparkles, check: Check, x: X, warn: AlertTriangle, gauge: Gauge, timer: Timer, scale: Scale,
  copy: Copy, save: Save, trash: Trash2, chat: MessageCircle, send: Send, plus: Plus, back: ArrowLeft, info: Info, reset: RotateCcw, ok: CircleCheck,
};
export function Icon({ name, className = "w-5 h-5", strokeWidth = 1.75 }) {
  const C = MAP[name] || Frame;
  return <C className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export function Drone({ className = "", spinning = true }) {
  const props = [[60, 60, false], [200, 60, true], [60, 200, true], [200, 200, false]];
  return (
    <svg viewBox="0 0 260 260" className={className} role="img" aria-label="רחפן FPV במבט מלמעלה">
      <g stroke="#262d36" strokeWidth="18" strokeLinecap="round">
        <line x1="70" y1="70" x2="190" y2="190" /><line x1="190" y1="70" x2="70" y2="190" />
      </g>
      <g stroke="#323a45" strokeWidth="1.5" fill="none">
        <line x1="70" y1="70" x2="190" y2="190" /><line x1="190" y1="70" x2="70" y2="190" />
      </g>
      <rect x="102" y="94" width="56" height="72" rx="10" fill="#161b21" stroke="#323a45" strokeWidth="1.5" />
      <rect x="114" y="110" width="32" height="32" rx="5" fill="#0e1216" stroke="var(--neon)" strokeOpacity=".45" />
      <circle cx="130" cy="126" r="3" fill="var(--neon)" className="blink" />
      <rect x="117" y="80" width="26" height="16" rx="4" fill="#1d232b" stroke="#3a434f" />
      <circle cx="130" cy="88" r="4.5" fill="#0b0e11" stroke="#5c6878" strokeWidth="1.2" />
      {props.map(([x, y, rev], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="47" fill="rgba(45,212,191,.035)" stroke="rgba(255,255,255,.06)" />
          <g className={spinning ? "prop" + (rev ? " rev" : "") : ""}>
            <path d={`M${x - 43} ${y} Q${x - 22} ${y - 8} ${x} ${y} Q${x + 22} ${y + 8} ${x + 43} ${y} Q${x + 22} ${y - 3} ${x} ${y} Q${x - 22} ${y + 3} ${x - 43} ${y}Z`} fill="#c9d1da" fillOpacity={spinning ? ".22" : ".7"} />
            <path d={`M${x} ${y - 43} Q${x + 8} ${y - 22} ${x} ${y} Q${x - 8} ${y + 22} ${x} ${y + 43} Q${x + 3} ${y + 22} ${x} ${y} Q${x - 3} ${y - 22} ${x} ${y - 43}Z`} fill="#c9d1da" fillOpacity={spinning ? ".22" : ".7"} />
          </g>
          <circle cx={x} cy={y} r="11" fill="#1d232b" stroke="#4a5562" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="3" fill="#8d96a3" />
        </g>
      ))}
    </svg>
  );
}

export function Level({ level, children }) {
  const icon = level === "error" ? "x" : level === "warn" ? "warn" : "check";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 border lv-${level || "ok"}`} style={{ borderRadius: 999 }}>
      <Icon name={icon} className="w-3.5 h-3.5" strokeWidth={2.2} />{children}
    </span>
  );
}

export const ils = n => "₪" + Math.round(n).toLocaleString("he-IL");
