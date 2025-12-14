"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { fetchUnreadCount } from "@/lib/unread";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function initialsFromEmail(email: string | null) {
  if (!email) return "?";
  const c = email.trim()[0]?.toUpperCase();
  return c || "?";
}

export default function Nav() {
  const r = useRouter();
  const pathname = usePathname() || "/";

  const [email, setEmail] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  // close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    let channel: any = null;

    async function loadUnread(userId: string) {
      try {
        const n = await fetchUnreadCount(userId);
        if (alive) setUnreadCount(n);
      } catch {
        if (alive) setUnreadCount(0);
      }
    }

    async function boot(sessionOverride?: any) {
      const sess =
        sessionOverride ??
        (await supabase.auth.getSession()).data.session;

      setIsAuthed(!!sess);
      setEmail(sess?.user.email ?? null);

      if (!sess?.user) {
        setUnreadCount(0);
        if (channel) channel.unsubscribe();
        return;
      }

      await loadUnread(sess.user.id);

      // realtime refresh unread on INSERT/UPDATE
      if (channel) channel.unsubscribe();
      channel = supabase
        .channel("nav-unread-messages")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          loadUnread(sess.user.id);
        })
        .subscribe();
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      boot(session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
      if (channel) channel.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    r.push("/");
  }

  // If not authed -> send to login and return back to current page
  function goAuthed(targetPath: string) {
    if (!isAuthed) {
      const next = encodeURIComponent(pathname || "/");
      r.push(`/login?next=${next}`);
      return;
    }
    r.push(targetPath);
  }

  const links = useMemo(
    () => [
      { href: "/", label: "Usluge", public: true },
      { href: "/oglasi", label: "Oglasi", public: true },
      { href: "/novi-oglas", label: "Novi oglas", public: false },
      { href: "/poruke", label: "Poruke", public: false },
      { href: "/profil", label: "Profil", public: false },
    ],
    []
  );

  const baseItem = "rounded-xl px-3 py-2 text-sm transition";
  const activeCls = "bg-black text-white";
  const idleCls = "text-gray-700 hover:bg-gray-100";
  const lockedCls = "text-gray-500 hover:bg-gray-100";

  function PorukeLabel() {
    return (
      <span className="inline-flex items-center">
        Poruke
        {isAuthed && unreadCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </span>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/75 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* LEFT: brand + desktop nav */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="mr-1 rounded-xl px-2 py-2 text-sm font-semibold hover:bg-gray-100 transition"
            >
              Usluge
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {links
                .filter((l) => l.href !== "/")
                .map((l) => {
                  const active = isActive(pathname, l.href);

                  if (l.public) {
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={cn(baseItem, active ? activeCls : idleCls)}
                      >
                        {l.label}
                      </Link>
                    );
                  }

                  const labelNode =
                    l.href === "/poruke" ? <PorukeLabel /> : <>{l.label}</>;

                  return (
                    <button
                      key={l.href}
                      type="button"
                      onClick={() => goAuthed(l.href)}
                      className={cn(
                        baseItem,
                        active ? activeCls : isAuthed ? idleCls : lockedCls
                      )}
                      title={!isAuthed ? "Potrebna je prijava" : undefined}
                    >
                      {labelNode}
                      {!isAuthed && <span className="ml-1 opacity-70">🔒</span>}
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            {isAuthed ? (
              <>
                <button
                  type="button"
                  onClick={() => r.push("/profil")}
                  className="h-9 w-9 rounded-full border bg-white flex items-center justify-center text-sm font-semibold hover:bg-gray-50 transition"
                  title="Profil"
                >
                  {initialsFromEmail(email)}
                </button>

                <span className="hidden lg:inline text-sm text-gray-600">{email}</span>

                <button
                  className="hidden md:inline rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 transition"
                  onClick={logout}
                  type="button"
                >
                  Odjava
                </button>
              </>
            ) : (
              <Link
                className="hidden md:inline rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 transition"
                href={`/login?next=${encodeURIComponent(pathname || "/")}`}
              >
                Prijava
              </Link>
            )}

            <button
              type="button"
              className="md:hidden rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 transition"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileOpen && (
          <div className="md:hidden pb-4">
            <div className="rounded-2xl border bg-white p-2">
              <div className="flex flex-col">
                {links.map((l) => {
                  const active = isActive(pathname, l.href);

                  if (l.public) {
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={cn(
                          "rounded-xl px-3 py-2 text-sm transition",
                          active ? "bg-black text-white" : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        {l.label}
                      </Link>
                    );
                  }

                  const labelNode =
                    l.href === "/poruke" ? <PorukeLabel /> : <>{l.label}</>;

                  return (
                    <button
                      key={l.href}
                      type="button"
                      onClick={() => goAuthed(l.href)}
                      className={cn(
                        "text-left rounded-xl px-3 py-2 text-sm transition",
                        active
                          ? "bg-black text-white"
                          : isAuthed
                          ? "hover:bg-gray-100 text-gray-700"
                          : "hover:bg-gray-100 text-gray-500"
                      )}
                    >
                      {labelNode}
                      {!isAuthed && <span className="ml-1 opacity-70">🔒</span>}
                    </button>
                  );
                })}

                <div className="mt-2 border-t pt-2">
                  {isAuthed ? (
                    <div className="flex items-center justify-between gap-3 px-2">
                      <div className="text-sm text-gray-600 truncate">{email}</div>
                      <button
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 transition"
                        onClick={logout}
                        type="button"
                      >
                        Odjava
                      </button>
                    </div>
                  ) : (
                    <Link
                      className="block rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 transition text-center"
                      href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                    >
                      Prijava
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
