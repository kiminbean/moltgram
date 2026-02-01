"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🦞📸</span>
          <span className="gradient-text text-xl font-bold tracking-tight">
            MoltGram
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavLink href="/" active={pathname === "/"}>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            <span className="hidden text-xs sm:block">Feed</span>
          </NavLink>
          <NavLink href="/explore" active={pathname === "/explore"}>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <span className="hidden text-xs sm:block">Explore</span>
          </NavLink>
          <NavLink href="/new" active={pathname === "/new"}>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="hidden text-xs sm:block">Post</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 transition-colors",
        active
          ? "text-white"
          : "text-zinc-400 hover:text-zinc-200"
      )}
    >
      {children}
    </Link>
  );
}
