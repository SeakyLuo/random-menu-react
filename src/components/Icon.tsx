import type { CSSProperties } from "react";

const paths = {
  stats: <path d="M4 20V11h4v9m2 0V6h4v14m2 0V3h4v17M2 20h20" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  filter: <path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" />,
  redraw: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5" /></>,
  list: <path d="M9 6h12M9 12h12M9 18h12M3 6h1m-1 6h1m-1 6h1" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  random: <path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3.5-2 5-5m3-4c1.3-2 2.5-3 4-3h3m-4-4 4 4-4 4" />,
  book: (
    <>
      <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14M6 9h3m-3 4h3m6-4h3m-3 4h3" />
    </>
  ),
  note: (
    <>
      <path d="M13 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M8 16h7m-7-4h2m5-8 3-3 4 4-3 3-6 2 2-6Z" />
    </>
  ),
  blocked: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="2" />
      <path d="M5 9v11h14V9m-9 4h4" />
    </>
  ),
  today: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="4" />
      <path d="M8 3v4m8-4v4M4 11h16m-12 5h3m3 0h2" />
    </>
  ),
  dishes: (
    <>
      <path d="M3 13h18M5 13a7 7 0 0 1 14 0M4 17h16M9 20h6M12 4v2" />
    </>
  ),
  restaurant: (
    <>
      <path d="M4 9v11h16V9M3 9l2-6h14l2 6M3 9a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2M9 20v-5h6v5" />
    </>
  ),
  personal: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
      <path d="M20 2v4m-2-2h4" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="m14 5-7 7 7 7" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  heart: (
    <path d="M12 21S3 15.5 3 9.2C3 3.8 9.5 2.5 12 7c2.5-4.5 9-3.2 9 2.2C21 15.5 12 21 12 21Z" />
  ),
  bookmark: <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4Z" />,
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2.5 7M3 5v6h6m3-5v6l4 2" />
    </>
  ),
  appearance: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3C9 3 3 7 5 14c2 7 15 6 15-11Z" />
      <path d="M4 21 15 10" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 24,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
