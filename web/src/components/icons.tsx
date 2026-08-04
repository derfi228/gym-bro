/** Линейные иконки для нижней панели. Наследуют цвет от родителя. */

type Props = { className?: string };

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BodyIcon({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <circle cx="12" cy="4.2" r="2.2" />
      <path d="M12 6.6v8" />
      <path d="M5.5 9.2 12 7.6l6.5 1.6" />
      <path d="M12 14.6 8.6 21" />
      <path d="M12 14.6 15.4 21" />
    </svg>
  );
}

export function DumbbellIcon({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M3 9.5v5" />
      <path d="M6 7.5v9" />
      <path d="M18 7.5v9" />
      <path d="M21 9.5v5" />
      <path d="M6 12h12" />
    </svg>
  );
}

export function ProgramIcon({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9h17" />
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <path d="M8.5 14.2l2 2 4-4" />
    </svg>
  );
}

export function SparkIcon({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3.5c.9 4 2.6 5.7 6.5 6.5-3.9.8-5.6 2.5-6.5 6.5-.9-4-2.6-5.7-6.5-6.5 3.9-.8 5.6-2.5 6.5-6.5Z" />
      <path d="M18 16.5c.4 1.8 1.2 2.6 3 3-1.8.4-2.6 1.2-3 3-.4-1.8-1.2-2.6-3-3 1.8-.4 2.6-1.2 3-3Z" />
    </svg>
  );
}

export function FlameIcon({ className }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 21c3.6 0 6-2.3 6-5.4 0-3.9-3.6-5.6-3.6-9.1C13 7.7 12.4 9 11 10.2c-1.3-1-1.6-2-1.6-3.4C7.6 8.6 6 11 6 14.3 6 18.2 8.4 21 12 21Z" />
      <path d="M12 21c1.7 0 2.8-1.1 2.8-2.6 0-1.9-1.7-2.6-1.7-4.3-1 1-1.5 1.7-2.4 2.5-.7.6-1.2 1.3-1.2 2.2 0 1.3 1 2.2 2.5 2.2Z" />
    </svg>
  );
}
