/**
 * components/auth/DNABackground.jsx
 * Animated DNA double helix sebagai background dekoratif di auth pages.
 * Pure CSS animation, zero JS runtime cost, responsive.
 */

export default function DNABackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes dna-float-l {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-24px) rotate(2deg); }
        }
        @keyframes dna-float-r {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-18px) rotate(-1.5deg); }
        }
        @keyframes dna-pulse {
          0%, 100% { opacity: 0.30; }
          50%       { opacity: 0.55; }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(30px, -20px) scale(1.05); }
          66%       { transform: translate(-20px, 15px) scale(0.97); }
        }
        .dna-strand-l { animation: dna-float-l 9s ease-in-out infinite; }
        .dna-strand-r { animation: dna-float-r 11s ease-in-out infinite; }
        .dna-pulse    { animation: dna-pulse 4s ease-in-out infinite; }
        .orb-1 { animation: orb-drift 18s ease-in-out infinite; }
        .orb-2 { animation: orb-drift 24s ease-in-out infinite reverse; }
        .orb-3 { animation: orb-drift 30s ease-in-out infinite 3s; }
      `}</style>

      {/* ── Ambient orbs ── */}
      <div
        className="orb-1 absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,191,191,0.12) 0%, transparent 70%)",
        }}
      />
      <div
        className="orb-2 absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(45,108,255,0.10) 0%, transparent 70%)",
        }}
      />
      <div
        className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,115,115,0.06) 0%, transparent 65%)",
        }}
      />

      {/* ── DNA Helix — Left ── */}
      <div className="dna-strand-l absolute -left-8 top-0 bottom-0 flex items-center opacity-[0.22] dark:opacity-[0.18]">
        <DNAHelix color1="#00bfbf" color2="#2d6cff" nodeColor="#4ddcdc" />
      </div>

      {/* ── DNA Helix — Right ── */}
      <div
        className="dna-strand-r absolute -right-8 top-0 bottom-0 flex items-center opacity-[0.18] dark:opacity-[0.14]"
        style={{ transform: "scaleX(-1)" }}
      >
        <DNAHelix color1="#2d6cff" color2="#00bfbf" nodeColor="#6090ff" />
      </div>

      {/* ── Floating molecules — small decorative dots ── */}
      <FloatingDots />
    </div>
  );
}

// ─── DNA Helix SVG ────────────────────────────────────────────────────────────
function DNAHelix({ color1, color2, nodeColor }) {
  const steps = 20;
  const height = 900;
  const stepH = height / steps;
  const cx = 60;
  const amp = 38;
  const freq = (Math.PI * 2) / ((steps * stepH) / steps);

  // Strand A: sinusoidal kiri
  const strandA = Array.from({ length: steps + 1 }, (_, i) => {
    const y = i * stepH;
    const x = cx + Math.sin((i * Math.PI * 2) / steps) * amp;
    return { x, y };
  });

  // Strand B: opposite phase
  const strandB = Array.from({ length: steps + 1 }, (_, i) => {
    const y = i * stepH;
    const x = cx - Math.sin((i * Math.PI * 2) / steps) * amp;
    return { x, y };
  });

  const pathA = strandA
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const pathB = strandB
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg width="120" height={height} viewBox={`0 0 120 ${height}`} fill="none">
      <defs>
        <linearGradient id="dna-grad-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color1} stopOpacity="0" />
          <stop offset="25%" stopColor={color1} stopOpacity="1" />
          <stop offset="75%" stopColor={color1} stopOpacity="1" />
          <stop offset="100%" stopColor={color1} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dna-grad-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color2} stopOpacity="0" />
          <stop offset="25%" stopColor={color2} stopOpacity="1" />
          <stop offset="75%" stopColor={color2} stopOpacity="1" />
          <stop offset="100%" stopColor={color2} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Backbone strands */}
      <path d={pathA} stroke="url(#dna-grad-a)" strokeWidth="1.5" />
      <path d={pathB} stroke="url(#dna-grad-b)" strokeWidth="1.5" />

      {/* Cross bridges (base pairs) */}
      {strandA.map((a, i) => {
        const b = strandB[i];
        if (!b) return null;
        // Hanya gambar bridge setiap 2 step
        if (i % 2 !== 0) return null;
        const alpha = 0.4 + 0.3 * Math.abs(Math.sin((i * Math.PI) / steps));
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={nodeColor}
            strokeWidth="0.8"
            strokeOpacity={alpha}
            strokeDasharray="2 2"
          />
        );
      })}

      {/* Nodes */}
      {strandA.map((p, i) => (
        <circle
          key={`a${i}`}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill={color1}
          fillOpacity={i % 2 === 0 ? 0.6 : 0.3}
          className="dna-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
      {strandB.map((p, i) => (
        <circle
          key={`b${i}`}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill={color2}
          fillOpacity={i % 2 === 0 ? 0.6 : 0.3}
          className="dna-pulse"
          style={{ animationDelay: `${i * 0.15 + 0.5}s` }}
        />
      ))}
    </svg>
  );
}

// ─── Floating Dots ─────────────────────────────────────────────────────────────
const DOTS = [
  {
    top: "12%",
    left: "18%",
    size: 5,
    color: "#00bfbf",
    delay: "0s",
    dur: "6s",
  },
  {
    top: "28%",
    left: "72%",
    size: 3,
    color: "#2d6cff",
    delay: "1.5s",
    dur: "8s",
  },
  {
    top: "55%",
    left: "12%",
    size: 4,
    color: "#4ddcdc",
    delay: "0.8s",
    dur: "7s",
  },
  {
    top: "68%",
    left: "85%",
    size: 6,
    color: "#00bfbf",
    delay: "2s",
    dur: "9s",
  },
  {
    top: "82%",
    left: "38%",
    size: 3,
    color: "#6090ff",
    delay: "0.4s",
    dur: "6.5s",
  },
  {
    top: "20%",
    left: "50%",
    size: 4,
    color: "#00bfbf",
    delay: "3s",
    dur: "7.5s",
  },
  {
    top: "90%",
    left: "60%",
    size: 5,
    color: "#2d6cff",
    delay: "1s",
    dur: "8.5s",
  },
  {
    top: "42%",
    left: "92%",
    size: 3,
    color: "#4ddcdc",
    delay: "2.5s",
    dur: "6s",
  },
];

function FloatingDots() {
  return (
    <>
      <style>{`
        @keyframes dot-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50%       { transform: translateY(-12px) scale(1.15); opacity: 0.9; }
        }
      `}</style>
      {DOTS.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: 0.5,
            boxShadow: `0 0 ${d.size * 3}px ${d.color}`,
            animation: `dot-float ${d.dur} ease-in-out infinite`,
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  );
}
