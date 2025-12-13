"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";
import { useEffect, useState } from "react";

type ConversationRow = {
  id: string;
  post_id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string;
};

type PostRow = { id: string; title: string; city: string };

export default function InboxPage() {
  const [items, setItems] = useState<
    Array<{ convo: ConversationRow; post: PostRow | null; otherUserId: string }>
  >([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sess = await supabase.auth.getSession();
      const uid = sess.data.session?.user.id ?? null;
      if (!uid) {
        location.href = "/login";
        return;
      }
      setMe(uid);

      const { data: convos, error } = await supabase
        .from("conversations")
        .select("id,post_id,user_a_id,user_b_id,last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(50);

      if (error) return;

      const postIds = (convos ?? []).map((c) => c.post_id);
      const postsResp = await supabase
        .from("posts")
        .select("id,title,city")
        .in("id", postIds);

      const postsMap = new Map<string, PostRow>();
      (postsResp.data ?? []).forEach((p) => postsMap.set(p.id, p as any));

      const mapped = (convos ?? []).map((c) => ({
        convo: c as any,
        post: postsMap.get(c.post_id) ?? null,
        otherUserId: c.user_a_id === uid ? c.user_b_id : c.user_a_id,
      }));

      setItems(mapped);
    })();
  }, []);

  // realtime: update inbox ordering when conversations change (last_message_at updated)
  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel("realtime-inbox")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updated = payload.new as any as ConversationRow;
          setItems((prev) => {
            const idx = prev.findIndex((x) => x.convo.id === updated.id);
            if (idx === -1) return prev;
            const copy = [...prev];
            copy[idx] = { ...copy[idx], convo: updated };
            copy.sort(
              (a, b) =>
                new Date(b.convo.last_message_at).getTime() -
                new Date(a.convo.last_message_at).getTime()
            );
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me]);

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="text-xl font-semibold">Poruke</h1>

        <div className="mt-4 space-y-3">
          {items.map(({ convo, post }) => (
            <Link
              key={convo.id}
              href={`/poruke/${convo.id}`}
              className="block rounded-2xl border p-4 hover:shadow-sm"
            >
              <div className="font-medium">{post?.title ?? "Oglas"}</div>
              <div className="text-sm text-gray-600">
                {post?.city ?? ""} · Zadnje: {new Date(convo.last_message_at).toLocaleString()}
              </div>
            </Link>
          ))}

          {items.length === 0 && (
            <div className="text-sm text-gray-600">Nema razgovora još.</div>
          )}
        </div>
      </div>
    </div>
  );
}
