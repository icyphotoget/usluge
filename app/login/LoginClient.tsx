"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter, useSearchParams } from "next/navigation";

function safeNext(nextParam: string | null) {
  // allow only internal paths to avoid open-redirect issues
  if (!nextParam) return "/";
  if (!nextParam.startsWith("/")) return "/";
  if (nextParam.startsWith("//")) return "/";
  return nextParam;
}

export default function LoginClient() {
  const r = useRouter();
  const sp = useSearchParams();

  const nextPath = useMemo(() => safeNext(sp.get("next")), [sp]);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) r.push(nextPath);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loginWithGoogle() {
    setError(null);
    setBusy(true);

    try {
      // After Google callback, Supabase will send the browser to redirectTo.
      // We redirect back into /login?next=... so our existing session check can push(nextPath).
      const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
      // no router push here — browser navigates to Google OAuth flow
    } catch (e: any) {
      setError(e?.message ?? "Greška");
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email } },
        });
        if (error) throw error;

        // If email confirmation is ON, session might not exist yet.
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) r.push(nextPath);
        else r.push("/login?next=" + encodeURIComponent(nextPath));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        r.push(nextPath);
      }
    } catch (err: any) {
      setError(err?.message ?? "Greška");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold">
          {mode === "login" ? "Prijava" : "Registracija"}
        </h1>

        {/* GOOGLE */}
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={busy}
          className="mt-4 w-full rounded-xl border p-3 font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          Nastavi s Google
        </button>

        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <div className="text-xs text-gray-500">ili</div>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* EMAIL/PASS FORM */}
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Ime / naziv profila"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          )}

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Lozinka"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={busy}
            className="w-full rounded-xl bg-black p-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "..." : mode === "login" ? "Prijavi se" : "Registriraj se"}
          </button>
        </form>

        <button
          className="mt-4 text-sm underline"
          onClick={() => {
            setError(null);
            setMode(mode === "login" ? "register" : "login");
          }}
          type="button"
        >
          {mode === "login"
            ? "Nemaš račun? Registriraj se"
            : "Već imaš račun? Prijavi se"}
        </button>

        <p className="mt-4 text-xs text-gray-600">
          Nakon prijave vraćamo te na: <span className="font-mono">{nextPath}</span>
        </p>
      </div>
    </div>
  );
}
