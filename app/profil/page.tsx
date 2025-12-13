"use client";

import Nav from "@/components/Nav";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at?: string;
};

type PostRow = {
  id: string;
  title: string;
  city: string;
  type: "offer" | "request";
  status: "active" | "paused" | "deleted";
  created_at: string;
};

export default function ProfilePage() {
  const r = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        r.push(`/login?next=${encodeURIComponent("/profil")}`);
        return;
      }

      setEmail(user.email ?? null);

      const prof = await supabase
        .from("profiles")
        .select("id,display_name,created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (prof.error) {
        setErr(prof.error.message);
        setLoading(false);
        return;
      }

      setProfile((prof.data as any) ?? { id: user.id, display_name: null });

      const mine = await supabase
        .from("posts")
        .select("id,title,city,type,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (mine.error) {
        setErr(mine.error.message);
        setLoading(false);
        return;
      }

      setPosts((mine.data ?? []) as any);
      setLoading(false);
    })();
  }, [r]);

  async function toggleStatus(post: PostRow) {
    // optional: pause/activate
    const nextStatus = post.status === "active" ? "paused" : "active";
    const res = await supabase
      .from("posts")
      .update({ status: nextStatus })
      .eq("id", post.id)
      .select("id,status")
      .single();

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p))
    );
  }

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-4xl p-4">
        <h1 className="text-2xl font-semibold">Moj profil</h1>

        {err && (
          <div className="mt-4 rounded-2xl border p-4 text-sm text-red-600 bg-white">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-4 text-sm text-gray-600">Učitavam...</div>
        ) : (
          <>
            <div className="mt-4 rounded-2xl border p-4 bg-white">
              <div className="text-sm text-gray-600">Email</div>
              <div className="font-medium">{email ?? "-"}</div>

              <div className="mt-3 text-sm text-gray-600">Display name</div>
              <div className="font-medium">{profile?.display_name ?? "-"}</div>

              <div className="mt-4 flex gap-3">
                <Link
                  href="/profil/uredi"
                  className="rounded-xl border px-4 py-2 text-sm font-medium"
                >
                  Uredi profil
                </Link>
                <Link
                  href="/novi-oglas"
                  className="rounded-xl border px-4 py-2 text-sm font-medium"
                >
                  Novi oglas
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Moji oglasi</h2>
                <div className="text-xs text-gray-600">{posts.length} kom</div>
              </div>

              <div className="mt-3 space-y-3">
                {posts.length === 0 ? (
                  <div className="text-sm text-gray-600">Nemaš još oglasa.</div>
                ) : (
                  posts.map((p) => (
                    <div key={p.id} className="rounded-2xl border p-4 bg-white">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          {p.type === "offer" ? "Nudim: " : "Tražim: "}
                          {p.title}
                        </div>
                        <div className="text-sm text-gray-600">{p.city}</div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                          Status: <span className="font-mono">{p.status}</span> •{" "}
                          {new Date(p.created_at).toLocaleString()}
                        </div>

                        <div className="flex gap-2">
                          <Link
                            className="text-sm underline"
                            href={`/oglas/${p.id}`}
                          >
                            Otvori
                          </Link>

                          {p.status !== "deleted" && (
                            <button
                              className="text-sm underline"
                              onClick={() => toggleStatus(p)}
                              type="button"
                            >
                              {p.status === "active" ? "Pauziraj" : "Aktiviraj"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
