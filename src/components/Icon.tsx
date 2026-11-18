import type { ReactNode } from "react";

// Ícones de traço (24x24, estilo Lucide — licença ISC). Inline para não depender de biblioteca.
const PATHS = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  flag: (<><path d="M4 22V4" /><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1" /></>),
  bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>),
  back: (<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>),
  close: (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  check: <path d="M20 6 9 17l-5-5" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  plus: (<><path d="M5 12h14" /><path d="M12 5v14" /></>),
  alert: (<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>),
  ban: (<><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>),
  camera: (<><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3" /></>),
  message: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />,
  send: (<><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>),
  sparkle: <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />,
  cog: (<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>),
  bulb: (<><path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.5 5.5 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>),
  thumb: (<><path d="M7 10v12" /><path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9" /></>),
  walk: (<><circle cx="13" cy="4" r="2" /><path d="m7 21 3-6 3 2v4" /><path d="m10 15 1.5-6 3 3H18" /><path d="M11.5 9 8 10.5 7 14" /></>),
  bus: (<><rect x="4" y="3" width="16" height="15" rx="2" /><path d="M4 11h16" /><path d="M8 21v-3M16 21v-3" /><path d="M8 15h.01M16 15h.01" /></>),
  train: (<><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 10h14" /><path d="M12 3v7" /><path d="m8 21 2-4M16 21l-2-4" /><path d="M9 14h.01M15 14h.01" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
