"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PostDetail = {
  id: string;
  user_id: string;
  type: "offer" | "request";
  city: string;
  title: string;
  description: string;
  price_cents: number | null;
  price_unit: string | null;
  category_id: number;
  created_at: string;
};

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sess = await supabase.auth.getSession();
      if (!sess.data.session) {
        location.href = "/login";
        return;
      }

      const p = await supabase
        .from("posts")
        .select("id,user_id,type,city,title,description,price_cents,price_unit,category_id,created_at")
        .eq("id", id)
        .single();

      if (p.error) setErr(p.error.message);
      else setPost(p.data as any);
    })();
  }, [id]);

  async function startChat() {
    if (!post) return;
    setErr(null);
    setBusy(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const me = sess.session?.user.id;
      if (!me) throw new Error("Nisi prijavljen.");

      // owner is post.user_id, other is current user
      const userA = post.user_id;
      const userB = me;

      if (userA === userB) {
        // you are the owner, go to messages list
        r.push("/poruke");
        return;
      }

      // upsert: find existing or create
      const existing = await supabase
        .from("conversations")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_a_id", userA)
        .eq("user_b_id", userB)
        .maybeSingle();

      if (existing.error && existing.status !== 406) throw existing.error;

      let convoId = existing.data?.id as string | undefined;

      if (!convoId) {
        const created = await supabase
          .from("conversations")
          .insert({ post_id: post.id, user_a_id: userA, user_b_id: userB })
          .select("id")
          .single();

        if (created.error) throw created.error;
        convoId = created.data.id;
      }

      r.push(`/poruke/${convoId}`);
    } catch (e: any) {
      setErr(e?.message ?? "Greška");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-3xl p-4">
        {err && <div className="rounded-2xl border p-4 text-sm text-red-600">{err}</div>}
        {!post ? (
          <div className="text-sm text-gray-600">Učitavam...</div>
        ) : (
          <div className="rounded-2xl border p-6 shadow-sm">
            <div className="text-sm text-gray-600">{post.city}</div>
            <h1 className="mt-1 text-2xl font-semibold">{post.title}</h1>
            <div className="mt-2 text-sm">
              {post.type === "offer" ? "Nudim uslugu" : "Tražim uslugu"}
            </div>

            {post.price_cents != null && (
              <div className="mt-4 text-lg">
                {Number(post.price_cents / 100).toFixed(2)} € {post.price_unit ? ` / ${post.price_unit}` : ""}
              </div>
            )}

            <p className="mt-4 whitespace-pre-wrap">{post.description}</p>

            <button
              disabled={busy}
              onClick={startChat}
              className="mt-6 w-full rounded-xl border p-3 font-medium"
            >
              {busy ? "..." : "Pošalji poruku"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
