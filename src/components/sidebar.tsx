"use client";

import {
  Award,
  BookOpenText,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { AccentSwitcher } from "@/components/accent-switcher";
import { signOut } from "@/app/auth/actions";

const primary = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracks", label: "Trilhas", icon: BookOpenText },
  { href: "/practice", label: "Arena", icon: Dumbbell },
  { href: "/achievements", label: "Conquistas", icon: Award },
];

const secondary = [
  { href: "/profile", label: "Perfil", icon: UserRound },
  { href: "/settings", label: "Configurações", icon: Settings },
];

function NavItems({ items }: { items: typeof primary }) {
  const pathname = usePathname();
  return items.map(({ href, label, icon: Icon }) => (
    <Link className={`nav-item ${pathname === href || pathname.startsWith(`${href}/`) ? "nav-item-active" : ""}`} href={href} key={href}>
      <Icon size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  ));
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="sidebar-nav">
        <span className="nav-kicker">Aprender</span>
        <NavItems items={primary} />
        <span className="nav-kicker nav-kicker-spaced">Sistema</span>
        <NavItems items={secondary} />
        <form action={signOut}>
          <button className="nav-item sidebar-signout" type="submit">
            <LogOut size={18} strokeWidth={1.8} />
            <span>Sair</span>
          </button>
        </form>
      </nav>
      <div className="sidebar-footer">
        <span className="nav-kicker">Atmosfera</span>
        <AccentSwitcher />
        <div className="system-status">
          <span className="status-light" />
          <span>
            <strong>Sistema online</strong>
            <small>Todos os módulos operacionais</small>
          </span>
        </div>
      </div>
    </aside>
  );
}
