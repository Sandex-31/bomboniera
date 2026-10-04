/** 18px line icons, currentColor. Inline so there is no icon-font request. */
type P = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconCap = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 4 2 9l10 5 10-5-10-5Z" />
    <path d="M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
  </svg>
);

export const IconBooks = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 4h4v16H5zM11 4h3v16h-3zM16.5 4.8l3.1.8-3.4 14.6-3.1-.8z" />
  </svg>
);

export const IconMonitor = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
    <path d="M9 20h6M12 16.5V20" />
  </svg>
);

export const IconScroll = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M7 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </svg>
);

export const IconTerminal = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="2.5" y="4" width="19" height="16" rx="2" />
    <path d="m7 10 2.5 2L7 14M13 14h4" />
  </svg>
);

export const IconDoor = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M14.5 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8.5a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z" />
    <path d="M12.5 12h.01M18 8v8" />
  </svg>
);

export const IconClose = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconMap = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="m9 4-6 2.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" />
    <path d="M9 4v13M15 6.5v13" />
  </svg>
);

export const IconCan = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M8 6h8a1 1 0 0 1 1 1l-.6 12a1 1 0 0 1-1 1H8.6a1 1 0 0 1-1-1L7 7a1 1 0 0 1 1-1Z" />
    <path d="M7.4 10h9.2M9.5 3.5h5" />
  </svg>
);

export const IconPerson = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20.5a7 7 0 0 1 14 0" />
  </svg>
);
