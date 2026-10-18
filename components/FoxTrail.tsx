// Bantalan telapak kaki rubah (tumit + empat jari), dipakai di jejak latar dan indikator berpikir.
const PAW_PADS = [
  { cx: 10, cy: 16, rx: 4.4, ry: 3.8 },
  { cx: 4.8, cy: 9.6, rx: 1.8, ry: 2.4 },
  { cx: 15.2, cy: 9.6, rx: 1.8, ry: 2.4 },
  { cx: 8, cy: 5.2, rx: 1.8, ry: 2.5 },
  { cx: 12, cy: 5.2, rx: 1.8, ry: 2.5 },
];

export function Paw({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 21" aria-hidden="true">
      {PAW_PADS.map((pad, i) => (
        <ellipse key={i} {...pad} />
      ))}
    </svg>
  );
}

// Jejak rubah hampir satu garis lurus (kaki belakang menapak di bekas kaki depan),
// berjalan dari pojok kiri bawah menuju tengah. Jejak terbaru (dekat tengah) paling jelas.
const STEPS = 12;
const ANGLE = 66; // arah langkah: naik ke kanan
const PRINTS = Array.from({ length: STEPS }, (_, i) => {
  const t = i / (STEPS - 1);
  const side = i % 2 === 0 ? -1 : 1; // kaki kiri-kanan bergantian, sedikit saja
  return {
    x: 30 + 530 * t + side * 1.6,
    y: 275 - 235 * t + side * 3.7,
    opacity: 0.08 + 0.32 * t,
  };
});

export default function FoxTrail() {
  return (
    <svg className="trail" viewBox="0 0 600 300" aria-hidden="true">
      {PRINTS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${ANGLE}) translate(-10 -12)`} opacity={p.opacity}>
          {PAW_PADS.map((pad, j) => (
            <ellipse key={j} {...pad} />
          ))}
        </g>
      ))}
    </svg>
  );
}
