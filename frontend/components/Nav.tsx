"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

function Drop() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5c3.6 4.3 6.5 7.6 6.5 11.2a6.5 6.5 0 0 1-13 0C5.5 10.1 8.4 6.8 12 2.5Z" fill="#3fd8cc" />
      <path d="M8.6 14.2a3.6 3.6 0 0 0 3.2 3.2" stroke="#05171f" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ApiStatus() {
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = () =>
      fetch(`${API_BASE}/health`, { cache: "no-store" })
        .then((r) => alive && setUp(r.ok))
        .catch(() => alive && setUp(false));
    ping();
    const t = setInterval(ping, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  if (up === null) return <div className="live" />;
  return (
    <div className="live" role="status">
      <i className={`dot ${up ? "" : "off"}`} />
      <span className="txt">{up ? "Live" : "API offline"}</span>
    </div>
  );
}

export default function Nav() {
  const path = usePathname();
  const link = (href: string, label: string, match: (p: string) => boolean) => (
    <Link href={href} aria-current={match(path) ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">
          <Drop /> AegisAI
        </Link>
        <nav className="nav-links" aria-label="Main">
          {link("/", "Overview", (p) => p === "/")}
          {link("/dashboard", "Dashboard", (p) => p.startsWith("/dashboard") || p.startsWith("/incidents"))}
          {link("/student", "Student view", (p) => p.startsWith("/student"))}
        </nav>
        <ApiStatus />
      </div>
    </header>
  );
}
