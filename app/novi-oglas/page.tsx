"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import Nav from "@/components/Nav";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

export default function NewPostPage() {
  const r = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [type, setType] = useState<"offer" | "request">("offer");
  const [categoryId, setCategoryId] = useState<string>("");
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [unit, setUnit] = useState("sat");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const sess = await supabase.auth.getSession();
      if (!sess.data.session) {
        location.href = "/login";
        return;
      }
      const c = await supabase.from("categories").select("id,name").order("id");
      if (!c.error) {
        setCats(c.data ?? []);
        setCategoryId(String(c.data?.[0]?.id ?? ""));
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) throw new Error("Nisi prijavljen.");

      const priceCents =
        price.trim() === "" ? null : Math.round(Number(price.replace(",", ".")) * 100);

      const { data, error } = await supabase.from("posts").insert({
        user_id: userId,
        type,
        category_id: Number(categoryId),
        city,
        title,
        description,
        price_cents: priceCents,
        price_unit: priceCents == null ? null : unit,
        status: "active",
      }).select("id").single();

      if (error) throw error;
      r.push(`/oglas/${data.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Greška");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-2xl border p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Novi oglas</h1>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <select className="w-full rounded-xl border p-3" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="offer">Nudim uslugu</option>
              <option value="request">Tražim uslugu</option>
            </select>

            <select className="w-full rounded-xl border p-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <input className="w-full rounded-xl border p-3" placeholder="Grad" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="w-full rounded-xl border p-3" placeholder="Naslov" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="w-full rounded-xl border p-3" rows={6} placeholder="Opis" value={description} onChange={(e) => setDescription(e.target.value)} />

            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-xl border p-3" placeholder="Cijena (npr. 10)" value={price} onChange={(e) => setPrice(e.target.value)} />
              <select className="rounded-xl border p-3" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="sat">sat</option>
                <option value="dan">dan</option>
                <option value="fiksno">fiksno</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button disabled={busy} className="w-full rounded-xl border p-3 font-medium">
              {busy ? "..." : "Objavi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
