/* D-Note line icon set — consistent 24px grid, 1.7 stroke, round caps/joins.
   Icons are kept geometric and minimal (Lucide-family vocabulary). */
const Ic = ({ d, size = 18, sw = 1.7, fill = "none", children, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: "0 0 auto", ...style }}
    aria-hidden="true"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

const Icon = {
  search: (p) => <Ic {...p} d="M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3" />,
  moon: (p) => <Ic {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  sun: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Ic>
  ),
  trash: (p) => <Ic {...p} d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />,
  doc: (p) => <Ic {...p} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" />,
  database: (p) => (
    <Ic {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M4 15h16M10 4v16" />
    </Ic>
  ),
  plus: (p) => <Ic {...p} d="M12 5v14M5 12h14" />,
  import: (p) => <Ic {...p} d="M12 3v12M8 11l4 4 4-4M5 21h14" />,
  export: (p) => <Ic {...p} d="M12 15V3M8 7l4-4 4 4M5 21h14" />,
  link: (p) => <Ic {...p} d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />,
  pin: (p) => <Ic {...p} d="M9 4h6l-1 6 3 3v1H7v-1l3-3-1-6ZM12 14v6" />,
  minus: (p) => <Ic {...p} d="M5 12h14" />,
  square: (p) => <Ic {...p}><rect x="5" y="5" width="14" height="14" rx="1.5" /></Ic>,
  close: (p) => <Ic {...p} d="M6 6l12 12M18 6L6 18" />,
  chevron: (p) => <Ic {...p} d="M9 6l6 6-6 6" />,
  chevronL: (p) => <Ic {...p} d="M15 6l-6 6 6 6" />,
  table: (p) => (
    <Ic {...p}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M3 14.5h18M9 4v16" />
    </Ic>
  ),
  board: (p) => (
    <Ic {...p}>
      <rect x="3" y="4" width="6" height="16" rx="1.5" />
      <rect x="11" y="4" width="6" height="10" rx="1.5" />
      <rect x="19" y="4" width="2" height="13" rx="1" />
    </Ic>
  ),
  gallery: (p) => (
    <Ic {...p}>
      <rect x="3" y="3.5" width="8" height="8" rx="1.5" />
      <rect x="13" y="3.5" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Ic>
  ),
  calendar: (p) => (
    <Ic {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
    </Ic>
  ),
  history: (p) => <Ic {...p} d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 8v4l3 2" />,
  download: (p) => <Ic {...p} d="M12 3v12M8 11l4 4 4-4M4 21h16" />,
  cal: (p) => (
    <Ic {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 3v4M16 3v4" />
    </Ic>
  ),
  lock: (p) => (
    <Ic {...p}>
      <rect x="4.5" y="10" width="15" height="11" rx="2.2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </Ic>
  ),
  eye: (p) => (
    <Ic {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Ic>
  ),
  eyeOff: (p) => <Ic {...p} d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.4A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3 3.6M6.2 6.2A16.4 16.4 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 2.8-.4" />,
  shield: (p) => <Ic {...p} d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6zM9 12l2 2 4-4" />,
  panel: (p) => (
    <Ic {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </Ic>
  ),
  more: (p) => (
    <Ic {...p} fill="currentColor" sw={0}>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </Ic>
  ),
  star: (p) => <Ic {...p} d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.1L12 16l-4.6 2.4.9-5.1L4.5 9.5l5.2-.8z" />,
  check: (p) => <Ic {...p} d="M5 12l5 5 9-10" />,
  text: (p) => <Ic {...p} d="M5 6h14M5 6v-1M5 6v1M12 6v12M9 18h6" />,
  drag: (p) => (
    <Ic {...p} fill="currentColor" sw={0}>
      <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
    </Ic>
  ),
  hash: (p) => <Ic {...p} d="M9 4L7 20M17 4l-2 16M5 9h14M4 15h14" />,
  quote: (p) => <Ic {...p} d="M7 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2M17 7h-2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-2" />,
  settings: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Ic>
  ),
  info: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.2" />
    </Ic>
  ),
  key: (p) => (
    <Ic {...p}>
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l9-9M17 5l2 2M14 8l2 2" />
    </Ic>
  ),
  refresh: (p) => <Ic {...p} d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />,
  monitor: (p) => (
    <Ic {...p}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </Ic>
  ),
  type: (p) => <Ic {...p} d="M5 6h14M5 6v-1M5 6v1M12 6v12M9 18h6" />,
  wifiOff: (p) => <Ic {...p} d="M3 3l18 18M9 9.5a8 8 0 0 0-3 2M3.5 8.2A14 14 0 0 1 8 5.3M16 9.7a8 8 0 0 1 2 1.8M20.5 8.2a14 14 0 0 0-5-3M9 13a4 4 0 0 1 5 0M12 18h.01" />,
  checkCircle: (p) => (
    <Ic {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </Ic>
  ),
  arrowRight: (p) => <Ic {...p} d="M5 12h14M13 6l6 6-6 6" />,
  sparkle: (p) => <Ic {...p} d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7zM19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8z" />,
  cloudOff: (p) => <Ic {...p} d="M3 3l18 18M7 16a4 4 0 0 1-.5-8 6 6 0 0 1 9.3-2M19.4 9.6A4 4 0 0 1 18 16H10" />,
  expand: (p) => <Ic {...p} d="M9 21H3v-6M21 9V3h-6M3 21l7-7M21 3l-7 7" />,
  note: (p) => (
    <Ic {...p}>
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l7-7V5a2 2 0 0 0-2-2Z" />
      <path d="M14 21v-5a1 1 0 0 1 1-1h5" />
    </Ic>
  ),
  palette: (p) => (
    <Ic {...p}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.5-.3-.9-.6-1.2-.3-.4-.5-.7-.5-1.2 0-.8.7-1.5 1.5-1.5H15a4 4 0 0 0 4-4c0-4.4-3.1-7.5-7-7.5Z" />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
    </Ic>
  ),
};

Object.assign(window, { Icon, Ic });
