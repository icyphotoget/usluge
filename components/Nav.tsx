"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Nav() {
  const r = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const sess = data.session;
      setIsAuthed(!!sess);
      setEmail(sess?.user.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(!!session);
      setEmail(session?.user.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
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
      <div className="mx-auto max-w-4xl p-4 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Link href="/" className="font-semibold">
            Usluge
          </Link>

          <button
            className="text-sm underline"
            onClick={() => goAuthed("/novi-oglas")}
            type="button"
          >
            Novi oglas
          </button>

          <button
            className="text-sm underline"
            onClick={() => goAuthed("/poruke")}
            type="button"
          >
            Poruke
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
