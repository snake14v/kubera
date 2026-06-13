// Orbéan line-icon set — 24x24, stroke=currentColor (colour via text-* class).
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export type IconProps = { className?: string };

export function CupIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" />
      <path d="M16 9h2.4a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M8 2.5c-.6 1 .6 1.6 0 2.7M11.5 2.5c-.6 1 .6 1.6 0 2.7" />
    </svg>
  );
}

export function LeafIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M5 20c-1-9 5-16 15-16 1 10-5 17-15 16z" />
      <path d="M5 20C9 14 13 11 18 10" />
    </svg>
  );
}

export function CrownIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7z" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function CapIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 4 2 9l10 5 10-5-10-5z" />
      <path d="M6 11.5V16c0 1.2 2.7 3 6 3s6-1.8 6-3v-4.5" />
      <path d="M22 9v5" />
    </svg>
  );
}

export function RocketIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3c3.2 1.4 5 4.6 5 8.5L14 15h-4l-3-3.5C7 7.6 8.8 4.4 12 3z" />
      <circle cx="12" cy="9.5" r="1.6" />
      <path d="M9.5 15c-2 .8-2.8 3-2.8 5 2 0 4.2-.9 5-2.8M14.5 15c2 .8 2.8 3 2.8 5-2 0-4.2-.9-5-2.8" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M16.5 13.5A5.5 5.5 0 0 1 20.5 19" />
    </svg>
  );
}

export function GlassIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M6 4h12l-1.4 15a1 1 0 0 1-1 .9H8.4a1 1 0 0 1-1-.9L6 4z" />
      <path d="M6.7 10h10.6" />
      <path d="M14 2l-1 8" />
    </svg>
  );
}

export function BadgeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 2.5l2.2 1.5 2.6-.4.6 2.6 2.2 1.5-1 2.5 1 2.5-2.2 1.5-.6 2.6-2.6-.4L12 19.5l-2.2-1.5-2.6.4-.6-2.6L4.4 14.3l1-2.5-1-2.5L6.6 7.8l.6-2.6 2.6.4L12 2.5z" />
      <path d="M9.2 11.2l2 2 3.6-3.6" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3l1.7 4.8L18.5 9l-4.8 1.2L12 15l-1.7-4.8L5.5 9l4.8-1.2L12 3z" />
      <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    </svg>
  );
}

export function DocIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h6M9.5 15.5h6M9.5 8.5h2" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
