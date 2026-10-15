"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Home,
  LogIn,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";
import { TopNav } from "@/components/TopNav";

const navigation = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/following", label: "Following", icon: UsersRound },
  { href: "/search", label: "Search", icon: Search },
];

const mobileNavigation = navigation.filter(({ href }) => href !== "/search");

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px]">
      <aside
        id="site-sidebar"
        aria-label="Site sidebar"
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-border transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:flex ${
          isSidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex w-full shrink-0 flex-col items-center px-3 pt-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={isSidebarOpen}
            aria-controls="sidebar-navigation"
            className="shrink-0"
          >
            {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        </div>
        <div
          id="sidebar-navigation"
          aria-hidden={!isSidebarOpen}
          inert={!isSidebarOpen}
          className={`flex w-64 min-h-0 flex-1 flex-col px-7 pb-8 pt-6 transition-opacity duration-200 motion-reduce:transition-none ${
            isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Link
            href="/"
            aria-hidden={!isSidebarOpen}
            inert={!isSidebarOpen}
            className={`mb-6 flex items-center gap-3 transition-opacity duration-200 motion-reduce:transition-none ${
              isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">mingle</span>
          </Link>
          <nav className="flex flex-col gap-2" aria-label="Primary navigation">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  pathname === href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
          </nav>
          {status === "authenticated" && session.user ? (
            <Link
              href={`/profile/${encodeURIComponent(session.user.username)}`}
              className="w-full mt-auto flex min-w-0 items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted"
            >
              <Image
                src={session.user.image?.trim() || DEFAULT_AVATAR}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {session.user.name || session.user.username}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{session.user.username}
                </span>
              </span>
            </Link>
          ) : (
            <Link
              href="/signin"
              className="mt-auto rounded-xl border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1 pb-16 lg:pb-0">
        <TopNav />
        {children}
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-border bg-background/95 px-4 backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        {mobileNavigation.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`flex flex-col items-center gap-1 text-[10px] ${
              pathname === href ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
        {status === "authenticated" && session.user ? (
          <Link
            href={`/profile/${encodeURIComponent(session.user.username)}`}
            aria-label="Your profile"
            title="Your profile"
            className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground"
          >
            <Image
              src={session.user.image?.trim() || DEFAULT_AVATAR}
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-full object-cover"
            />
            Profile
          </Link>
        ) : (
          <Link
            href="/signin"
            aria-label="Sign in"
            title="Sign in"
            className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground"
          >
            <LogIn className="size-5" />
            Sign in
          </Link>
        )}
      </nav>
    </div>
  );
}
