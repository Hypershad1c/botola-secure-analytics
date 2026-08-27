"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  ["Overview", "/", "⌂"],
  ["Teams", "/teams", "◈"],
  ["Compare", "/compare", "⇄"],
  ["Players", "/players", "◇"],
  ["Predictions", "/predictions", "◌"],
  ["Scouting", "/scouting", "◎"],
  ["Data quality", "/data", "▦"],
  ["Reports", "/reports", "↗"],
  ["Security", "/security", "⚿"],
  ["AI analyst", "/analyst", "✦"],
] as const;

export function OperationsShell({ children, title, section }: { children: ReactNode; title: string; section: string }) {
  const pathname = usePathname();
  return <div className="dashboard-shell">
    <aside className="sidebar">
      <Link className="brand-lockup" href="/"><span className="brand-mark">B</span><span><strong>BOTOLA</strong><span>SECURE ANALYTICS</span></span></Link>
      <p className="sidebar-section-label">Operations</p>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navigation.map(([label, href, icon]) => <Link className={`nav-item ${pathname === href ? "active" : ""}`} href={href} key={href}><span className="nav-icon">{icon}</span>{label}</Link>)}
      </nav>
      <div className="sidebar-footer"><span className="status-dot"><i />Data systems online</span><small>Protected operator workspace</small></div>
    </aside>
    <main className="dashboard-main">
      <header className="topbar"><div className="breadcrumb"><span>Botola intelligence</span><b>/</b><strong>{section}</strong></div><div className="topbar-actions"><span className="live-chip"><i />Canonical data mode</span><Link className="avatar" href="/login" aria-label="Account and sign in">BA</Link></div></header>
      <div className="content-wrap"><p className="eyebrow">BOTOLA / {section.toUpperCase()}</p><h1 className="page-title">{title}</h1>{children}</div>
    </main>
  </div>;
}
