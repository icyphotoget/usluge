"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Conv = { id: string; user1_id: string; user2_id: string };

export default function PorukePage() {
  const r = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) {
        r.push(`/login?next=${encodeURIComponent("/poruke")}`);
        return;
      }

      setMe(user.id);

      // fetch convs where user is participant
      const a = await supabase.from("conversations").select("id,user1_id,user2_id").eq("user1_id", user.id);
      const b = await supabase.from("conversations").select("id,user1_id,user2_id").eq("user2_id", user.id);

      if (a.error) {
        setErr(a.error.message);
        setLoading(false);
        return;
      }
      if (b.error) {
        setErr(b.error.message);
        setLoading(false);
        return;
      }

      const all = ([...(a.data ?? []), ...(b.data ?? [])] as any) as Conv[];
      setConvs(all);

      // mark as read: all messages in my conversations NOT sent by me
      const convIds = all.map((c) => c.id);
      if (convIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in("conversation_id", convIds)
          .eq("is_read", false)
          .neq("sender_id", user.id);
      }

      setLoading(false);
    })();
  }, [r]);

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="text-2xl font-semibold">Poruke</h1>

        {err && (
          <div className="mt-4 rounded-2xl border p-4 text-sm text-red-600 bg-white">{err}</div>
        )}

        {loading ? (
          <div className="mt-4 text-sm text-gray-600">Učitavam...</div>
        ) : convs.length === 0 ? (
          <div className="mt-4 text-sm text-gray-600">Nema razgovora.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {convs.map((c) => (
              <Link
                key={c.id}
                href={`/poruke/${c.id}`}
                className="block rounded-2xl border p-4 bg-white hover:shadow-sm"
              >
                <div className="text-sm text-gray-600">Razgovor</div>
                <div className="font-medium">Conversation ID: {c.id}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
