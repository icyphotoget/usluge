"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Conv = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  post_id: string | null;
  created_at: string;
  last_message_at: string | null;
};

export default function PorukePage() {
  const r = useRouter();

  const [me, setMe] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;

      if (!user) {
        r.push(`/login?next=${encodeURIComponent("/poruke")}`);
        return;
      }

      if (!alive) return;
      setMe(user.id);

      // ✅ fetch convs where user is participant (user_a_id OR user_b_id)
      const { data, error } = await supabase
        .from("conversations")
        .select("id,user_a_id,user_b_id,post_id,created_at,last_message_at")
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) {
        if (!alive) return;
        setErr(error.message);
        setLoading(false);
        return;
      }

      const all = (data ?? []) as Conv[];
      if (!alive) return;
      setConvs(all);

      // ✅ mark as read: all messages in my conversations NOT sent by me
      const convIds = all.map((c) => c.id);
      if (convIds.length > 0) {
        // Update only messages that are still unread
        // (is_read false OR read_at null - ovisno što koristiš)
        const nowIso = new Date().toISOString();

        const upd = await supabase
          .from("messages")
          .update({ is_read: true, read_at: nowIso })
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .or("is_read.eq.false,read_at.is.null"); // pokriva oba slučaja

        // ne rušimo UI ako mark-read faila, ali pokažemo error ako želiš
        if (upd.error) {
          console.warn("Mark read error:", upd.error.message);
        }
      }

      if (!alive) return;
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [r]);

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="text-2xl font-semibold">Poruke</h1>

        {err && (
          <div className="mt-4 rounded-2xl border p-4 text-sm text-red-600 bg-white">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-4 text-sm text-gray-600">Učitavam...</div>
        ) : convs.length === 0 ? (
          <div className="mt-4 text-sm text-gray-600">Nema razgovora.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {convs.map((c) => {
              const otherId =
                me && c.user_a_id === me ? c.user_b_id : c.user_a_id;

              return (
                <Link
                  key={c.id}
                  href={`/poruke/${c.id}`}
                  className="block rounded-2xl border p-4 bg-white hover:shadow-sm"
                >
                  <div className="text-sm text-gray-600">Razgovor</div>
                  <div className="font-medium">
                    S korisnikom: <span className="font-mono">{otherId}</span>
                  </div>
                  {c.post_id && (
                    <div className="mt-1 text-xs text-gray-500">
                      Post: <span className="font-mono">{c.post_id}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
