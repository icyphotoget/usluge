"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function Nav() {
  const r = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    r.push("/login");
  }

  return (
    <div className="border-b">
      <div className="mx-auto max-w-4xl p-4 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <Link href="/" className="font-semibold">Usluge</Link>
          <Link href="/novi-oglas" className="text-sm underline">Novi oglas</Link>
          <Link href="/poruke" className="text-sm underline">Poruke</Link>
        </div>
        <div className="flex gap-3 items-center">
          {email ? (
            <>
              <span className="text-sm text-gray-600">{email}</span>
              <button className="text-sm underline" onClick={logout}>Odjava</button>
            </>
          ) : (
            <Link className="text-sm underline" href="/login">Prijava</Link>
          )}
        </div>
      </div>
    </div>
  );
}
