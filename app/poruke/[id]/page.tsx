"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  is_read: boolean;
};

export default function ChatPage() {
  const { id } = useParams<{ id: string }>(); // conversation id
  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    (async () => {
      const sess = await supabase.auth.getSession();
      const uid = sess.data.session?.user.id ?? null;
      if (!uid) {
        location.href = "/login";
        return;
      }
      setMe(uid);

      // load initial messages
      const resp = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,body,created_at,is_read")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(200);

      if (resp.error) setErr(resp.error.message);
      else setMessages((resp.data ?? []) as any);

      setTimeout(scrollToBottom, 50);

      // mark read (best-effort)
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", id)
        .neq("sender_id", uid)
        .eq("is_read", false);
    })();
  }, [id]);

  // realtime subscribe to INSERT on messages for this conversation
  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel(`realtime-messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as any as MessageRow;
          setMessages((prev) => [...prev, msg]);
          setTimeout(scrollToBottom, 10);

          // auto mark read if message is from other user
          if (msg.sender_id !== me) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, me]);

  async function send() {
    setErr(null);
    const body = text.trim();
    if (!body) return;
    if (!me) return;

    setText("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: me,
      body,
    });

    if (error) {
      setErr(error.message);
      setText(body); // restore text if failed
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <div className="mx-auto w-full max-w-3xl p-4 flex-1 flex flex-col">
        {err && <div className="mb-3 rounded-2xl border p-3 text-sm text-red-600">{err}</div>}

        <div className="flex-1 overflow-auto rounded-2xl border p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl border p-3 ${
                m.sender_id === me ? "ml-auto" : ""
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{m.body}</div>
              <div className="mt-1 text-xs text-gray-500">
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded-xl border p-3"
            placeholder="Napiši poruku…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="rounded-xl border px-4 font-medium" onClick={send}>
            Pošalji
          </button>
        </div>
      </div>
    </div>
  );
}
