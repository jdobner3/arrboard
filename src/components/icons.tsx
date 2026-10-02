import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const HomeIcon = (p: P) => (<svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
export const LibraryIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="4" width="7" height="16" rx="1.5" /><rect x="14" y="4" width="7" height="16" rx="1.5" /></svg>);
export const CalendarIcon = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
export const DownloadIcon = (p: P) => (<svg {...base} {...p}><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 21h16" /></svg>);
export const MoreIcon = (p: P) => (<svg {...base} {...p}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>);
export const SearchIcon = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const PlusIcon = (p: P) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const BackIcon = (p: P) => (<svg {...base} {...p}><path d="M15 18 9 12l6-6" /></svg>);
export const ChevronIcon = (p: P) => (<svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>);
export const PauseIcon = (p: P) => (<svg {...base} {...p}><path d="M8 5v14M16 5v14" /></svg>);
export const PlayIcon = (p: P) => (<svg {...base} {...p}><path d="M7 4v16l13-8z" /></svg>);
export const TrashIcon = (p: P) => (<svg {...base} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const BookmarkIcon = (p: P) => (<svg {...base} {...p}><path d="M6 3h12v18l-6-4-6 4z" /></svg>);
export const RefreshIcon = (p: P) => (<svg {...base} {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>);
export const CheckIcon = (p: P) => (<svg {...base} {...p}><path d="m5 12 5 5 9-10" /></svg>);
export const XIcon = (p: P) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const AlertIcon = (p: P) => (<svg {...base} {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></svg>);
