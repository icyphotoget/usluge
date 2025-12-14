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

    async function init() {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      setIsAuthed(!!sess);
      setEmail(sess?.user.email ?? null);

      if (!sess?.user) {
        setUnreadCount(0);
        return;
      }

      // initial unread load
      try {
        const n = await fetchUnreadCount(sess.user.id);
        setUnreadCount(n);
      } catch {
        // ignore
      }

      // realtime: new messages + read updates
      channel = supabase
        .channel("nav-unread-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          async () => {
            try {
              const n = await fetchUnreadCount(sess.user.id);
              setUnreadCount(n);
            } catch {
              // ignore
            }
          }
        )
        .subscribe();
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthed(!!session);
      setEmail(session?.user.email ?? null);

      if (!session?.user) {
        setUnreadCount(0);
        if (channel) channel.unsubscribe();
        return;
      }

      // reload unread on auth change
      try {
        const n = await fetchUnreadCount(session.user.id);
        setUnreadCount(n);
      } catch {
        setUnreadCount(0);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      if (channel) channel.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    r.push("/");
  }

  function goAuthed(path: string) {
    if (!isAuthed) {
      const next = encodeURIComponent(path);
      r.push(`/login?next=${next}`);
      return;
    }
    r.push(path);
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

          <button className="text-sm underline" onClick={() => goAuthed("/novi-oglas")} type="button">
            Novi oglas
          </button>

          <button className="text-sm underline" onClick={() => goAuthed("/poruke")} type="button">
            <span className="inline-flex items-center">
              Poruke
              {isAuthed && unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </span>
          </button>

          <button className="text-sm underline" onClick={() => goAuthed("/profil")} type="button">
            Profil
          </button>
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
