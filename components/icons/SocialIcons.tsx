import type { SVGProps } from "react";

/** Íconos con los colores de marca de cada red, para que se reconozcan de un
 * vistazo (no son trazos genéricos en un solo color). */

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  const gradientId = "instagram-gradient";
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="24" x2="24" y2="0">
          <stop offset="0%" stopColor="#FEE411" />
          <stop offset="15%" stopColor="#FEDA77" />
          <stop offset="35%" stopColor="#F58529" />
          <stop offset="55%" stopColor="#DD2A7B" />
          <stop offset="75%" stopColor="#8134AF" />
          <stop offset="100%" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill={`url(#${gradientId})`} />
      <rect
        x="6.25"
        y="6.25"
        width="11.5"
        height="11.5"
        rx="4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="#ffffff" strokeWidth="1.6" />
      <circle cx="16.2" cy="7.8" r="1.15" fill="#ffffff" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10.5" fill="#1877F2" />
      <path
        d="M15.4 12.7h-2.15V20h-3.02v-7.3H8.7v-2.55h1.53V8.6c0-2.02.9-3.23 3.28-3.23h2.02v2.55h-1.26c-.94 0-1 .35-1 1.01l-.01 1.22h2.31l-.27 2.55z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0000" />
      <path d="M10 8.6l6 3.4-6 3.4V8.6z" fill="#ffffff" />
    </svg>
  );
}
