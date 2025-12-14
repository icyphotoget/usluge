"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { fetchUnreadCount } from "@/lib/unread";

export default function Nav() {
  const r = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let channel: any = null;
    let alive = true;

    async function refresh(userId: string) {
      const n = await fetchUnreadCount(userId);
      if (alive) setUnreadCount(n);
    }

    async function startForSession() {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setIsAuthed(!!sess);
      setEmail(sess?.user.email ?? null);

      if (!sess?.user) {
        setUnreadCount(0);
        if (channel) channel.unsubscribe();
        return;
      }

      await refresh(sess.user.id);

      // realtime - safe (ne filtriramo na receiver_id jer ga nema)
      if (channel) channel.unsubscribe();
      channel = supabase
        .channel("nav-unread-messages")
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          refresh(sess.user.id);
        })
        .subscribe();
    }

    startForSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      setEmail(session?.user.email ?? null);

      if (!session?.user) {
        setUnreadCount(0);
        if (channel) channel.unsubscribe();
        return;
      }
      startForSession();
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

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-5xl p-4 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Link href="/" className="font-semibold">
            Usluge
          </Link>

          <Link className="text-sm underline" href="/oglasi">
            Oglasi
          </Link>

          {isAuthed && (
            <>
              <Link className="text-sm underline" href="/novi-oglas">
                Novi oglas
              </Link>

              <Link className="text-sm underline" href="/poruke">
                <span className="inline-flex items-center">
                  Poruke
                  {unreadCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </Link>

              <Link className="text-sm underline" href="/profil">
                Profil
              </Link>
            </>
          )}
        </div>

        <div className="flex gap-3 items-center">
          {isAuthed ? (
            <>
              <span className="text-sm text-gray-600">{email}</span>
              <button className="text-sm underline" onClick={logout} type="button">
                Odjava
              </button>
            </>
          ) : (
            <Link className="text-sm underline" href={`/login?next=${encodeURIComponent("/")}`}>
              Prijava
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
