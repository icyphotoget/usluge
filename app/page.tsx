"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";
import Nav from "@/components/Nav";

type PostRow = {
  id: string;
  type: "offer" | "request";
  city: string;
  title: string;
  description: string;
  price_cents: number | null;
  price_unit: string | null;
  created_at: string;
  category_id: number;
};

type Category = { id: number; name: string };

export default function HomePage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<"" | "offer" | "request">("");
  const [catId, setCatId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const sess = await supabase.auth.getSession();
      if (!sess.data.session) {
        location.href = "/login";
        return;
      }

      const c = await supabase.from("categories").select("id,name").order("id");
      if (!c.error) setCats(c.data ?? []);

      const p = await supabase
        .from("posts")
        .select("id,type,city,title,description,price_cents,price_unit,created_at,category_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!p.error) setPosts(p.data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (type && p.type !== type) return false;
      if (city && !p.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (catId && String(p.category_id) !== catId) return false;
      if (q) {
        const hay = (p.title + " " + p.description).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [posts, q, city, type, catId]);

  return (
    <div>
      <Nav />

      <div className="mx-auto max-w-4xl p-4">
        <div className="rounded-2xl border p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <input className="rounded-xl border p-3" placeholder="Traži..." value={q} onChange={(e) => setQ(e.target.value)} />
            <input className="rounded-xl border p-3" placeholder="Grad" value={city} onChange={(e) => setCity(e.target.value)} />
            <select className="rounded-xl border p-3" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="">Svi tipovi</option>
              <option value="offer">Nudim</option>
              <option value="request">Tražim</option>
            </select>
            <select className="rounded-xl border p-3" value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">Sve kategorije</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/oglas/${p.id}`} className="block rounded-2xl border p-4 hover:shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  {p.type === "offer" ? "Nudim: " : "Tražim: "}
                  {p.title}
                </div>
                <div className="text-sm text-gray-600">{p.city}</div>
              </div>
              <div className="mt-2 text-sm text-gray-700 line-clamp-2">{p.description}</div>
              {p.price_cents != null && (
                <div className="mt-2 text-sm">
                  {Number(p.price_cents / 100).toFixed(2)} € {p.price_unit ? ` / ${p.price_unit}` : ""}
                </div>
              )}
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-gray-600">Nema rezultata.</div>
          )}
        </div>
      </div>
    </div>
  );
}
