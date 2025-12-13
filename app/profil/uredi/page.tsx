"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const r = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        r.push(`/login?next=${encodeURIComponent("/profil/uredi")}`);
        return;
      }

      const prof = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (prof.error) {
        setErr(prof.error.message);
        return;
      }

      setDisplayName(prof.data?.display_name ?? "");
    })();
  }, [r]);

  async function save() {
    setErr(null);
    setBusy(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        r.push(`/login?next=${encodeURIComponent("/profil/uredi")}`);
        return;
      }

      const up = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, display_name: displayName },
          { onConflict: "id" }
        )
        .select("id,display_name")
        .single();

      if (up.error) throw up.error;

      r.push("/profil");
      setTimeout(() => r.refresh(), 50);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-md p-4">
        <h1 className="text-2xl font-semibold">Uredi profil</h1>

        {err && (
          <div className="mt-4 rounded-2xl border p-4 text-sm text-red-600 bg-white">
            {err}
          </div>
        )}

        <div className="mt-4 rounded-2xl border p-4 bg-white">
          <label className="text-sm text-gray-600">Display name</label>

          <input
            className="mt-2 w-full rounded-xl border p-3"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="npr. Marko"
            autoComplete="name"
          />

          <button
            disabled={busy}
            onClick={save}
            className="mt-4 w-full rounded-xl border p-3 font-medium disabled:opacity-60"
            type="button"
          >
            {busy ? "..." : "Spremi"}
          </button>

          <p className="mt-3 text-xs text-gray-600">
            Napomena: ako prvi put spremaš display name, ovo će kreirati zapis u
            tablici <span className="font-mono">profiles</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
