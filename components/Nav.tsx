"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Nav() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      setIsAuthed(!!sess);
      setEmail(sess?.user.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      setEmail(session?.user.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function goAuthed(path: string) {
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    router.push(path);
  }

  if (!ready) return null; // sprječava hydration flicker

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        {/* LEFT */}
        <nav className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-lg">
            Usluge
          </Link>

          <Link href="/oglasi" className="text-sm underline">
            Oglasi
          </Link>

          <button
            type="button"
            className="text-sm underline"
            onClick={() => goAuthed("/novi-oglas")}
          >
            Novi oglas
          </button>

          <button
            type="button"
            className="text-sm underline"
            onClick={() => goAuthed("/poruke")}
          >
            Poruke
          </button>

          {isAuthed && (
            <Link href="/profil" className="text-sm underline">
              Profil
            </Link>
          )}
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <>
              <span className="text-sm text-gray-600 truncate max-w-[200px]">
                {email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-sm underline"
              >
                Odjava
              </button>
            </>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent("/")}`}
              className="text-sm underline"
            >
              Prijava
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
