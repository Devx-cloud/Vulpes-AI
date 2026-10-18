import { useId } from "react";
import { cls } from "@/lib/ui";

// Logo Vulpes: kepala rubah merah geometris (telinga runcing, pipi krem, mata amber).
// glowing: mata berdenyut, dipakai saat memuat atau saat jawaban sedang ditulis.
export default function FoxMark({ className, glowing }: { className?: string; glowing?: boolean }) {
  // useId bisa berisi karakter yang tidak valid di url(#...), jadi dibersihkan.
  const id = `fx${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg className={cls("fox-mark", glowing && "is-glowing", className)} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef5350" />
          <stop offset="1" stopColor="#b71c1c" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M3 12 7 2l6.5 10h5L25 2l4 10-13 18Z" />
      <path className="fox-shade" d="M5.6 11 7.4 5.2 11.2 11ZM26.4 11 24.6 5.2 20.8 11Z" />
      <path className="fox-cheek" d="M3 12 12 20 16 30ZM29 12 20 20 16 30Z" />
      <path className="fox-eye" d="M9.2 15.6 12.6 16.4 10.4 17.6ZM22.8 15.6 19.4 16.4 21.6 17.6Z" />
      <path className="fox-nose" d="M14.4 27.4h3.2L16 30Z" />
    </svg>
  );
}
