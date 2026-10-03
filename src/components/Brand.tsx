import { Pirata_One } from "next/font/google";

const pirate = Pirata_One({ weight: "400", subsets: ["latin"], display: "swap" });

/** The Jolly Roger from the app icon, without the tile behind it. */
export function JollyRoger({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="8 8 48 52" className={className} aria-hidden>
      <g stroke="#ece4cf" strokeWidth="4.5" strokeLinecap="round">
        <path d="M15 41 49 58M49 41 15 58" />
      </g>
      <g fill="#ece4cf">
        <circle cx="13.5" cy="38.5" r="3" /><circle cx="16.5" cy="37.5" r="3" />
        <circle cx="50.5" cy="38.5" r="3" /><circle cx="47.5" cy="37.5" r="3" />
        <circle cx="13.5" cy="60" r="3" /><circle cx="16.5" cy="61" r="3" />
        <circle cx="50.5" cy="60" r="3" /><circle cx="47.5" cy="61" r="3" />
      </g>
      <ellipse cx="32" cy="27" rx="14" ry="13.5" fill="#ece4cf" />
      <rect x="24.5" y="34" width="15" height="11" rx="3.5" fill="#ece4cf" />
      <circle cx="26.5" cy="28" r="3.6" fill="#10151f" />
      <path d="M32 31.5 29.8 35h4.4z" fill="#10151f" />
      <path d="M29 39.5v5M32 39.5v5M35 39.5v5" stroke="#10151f" strokeWidth="1.4" />
      <path d="M19.5 20.5 44 33" stroke="#10151f" strokeWidth="1.6" />
      <ellipse cx="37.6" cy="28.3" rx="4.6" ry="4.2" fill="#10151f" />
      <path d="M17.6 25.5C17.6 13 25 10.5 32 10.5S46.4 13 46.4 25.5C40 20.6 24 20.6 17.6 25.5Z" fill="#d94a3d" />
      <circle cx="24" cy="16.5" r="1.1" fill="#f6d9a8" /><circle cx="31" cy="14.5" r="1.1" fill="#f6d9a8" /><circle cx="38.5" cy="16.2" r="1.1" fill="#f6d9a8" />
      <path d="M45 19.5 53 15.5 51 22.5ZM45.5 22 52.5 25.5 46.5 26.5Z" fill="#b83a2f" />
    </svg>
  );
}

/** "Arrboard" with the pirate "Arr". */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2" aria-label="Arrboard">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#10151f] shadow-sm">
        <JollyRoger className="h-8 w-8" />
      </span>
      <span className="flex items-baseline">
        <span className={`${pirate.className} text-[2.1rem] leading-none text-[#d94a3d] [text-shadow:0_1px_0_rgba(0,0,0,0.25)]`}>Arr</span>
        <span className="text-2xl font-bold tracking-tight">board</span>
      </span>
    </span>
  );
}
