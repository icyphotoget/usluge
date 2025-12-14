"use client";

import Nav from "@/components/Nav";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

function cardStyle(seed: number) {
  // stabilan “banner” look bez slika (možeš kasnije zamijeniti slikama iz /public)
  const hue = (seed * 47) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 35) % 360} 75% 55%))`,
  } as React.CSSProperties;
}

export default function LandingClient() {
  const r = useRouter();

  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState<"" | "offer" | "request">("");
  const [catId, setCatId] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoadingCats(true);
      const c = await supabase.from("categories").select("id,name").order("id");
      setCats((c.data ?? []) as any);
      setLoadingCats(false);
    })();
  }, []);

  const topCats = useMemo(() => cats.slice(0, 12), [cats]);

  function goToOglasi(extra?: Partial<{ q: string; city: string; type: string; cat: string }>) {
    const params = new URLSearchParams();
    const qq = extra?.q ?? q;
    const cc = extra?.city ?? city;
    const tt = extra?.type ?? type;
    const cat = extra?.cat ?? catId;

    if (qq) params.set("q", qq);
    if (cc) params.set("city", cc);
    if (tt) params.set("type", tt);
    if (cat) params.set("cat", cat);

    const qs = params.toString();
    r.push(`/oglasi${qs ? `?${qs}` : ""}`);
  }

  return (
    <div>
      <Nav />

      <div className="mx-auto max-w-5xl p-4">
        {/* HERO */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-3xl font-semibold leading-tight">
                Pronađi ili ponudi usluge u svom gradu.
              </h1>
              <p className="mt-3 text-gray-600">
                Pregledaj oglase bez prijave. Objavi oglas i dogovori se porukama kad se ulogiraš.
              </p>

              {/* SEARCH */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-xl border p-3"
                  placeholder="Traži (npr. čuvanje pasa)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <input
                  className="rounded-xl border p-3"
                  placeholder="Grad (npr. Zagreb)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <select
                  className="rounded-xl border p-3"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="">Svi tipovi</option>
                  <option value="offer">Nudim</option>
                  <option value="request">Tražim</option>
                </select>

                <select
                  className="rounded-xl border p-3"
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                >
                  <option value="">Sve kategorije</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-xl bg-black px-5 py-3 text-white font-medium"
                  onClick={() => goToOglasi()}
                  type="button"
                >
                  Pregledaj oglase
                </button>

                <Link
                  className="rounded-xl border px-5 py-3 font-medium"
                  href="/novi-oglas"
                >
                  Objavi oglas
                </Link>

                <Link className="underline text-sm self-center" href="/oglasi">
                  Ili odmah vidi sve oglase →
                </Link>
              </div>
            </div>

            {/* SIDE CARD */}
            <div className="rounded-3xl border bg-gray-50 p-6">
              <div className="text-sm text-gray-600">Kako radi</div>
              <ol className="mt-3 space-y-3 text-sm">
                <li className="rounded-2xl border bg-white p-4">
                  <div className="font-medium">1) Pregledaj</div>
                  <div className="text-gray-600">Oglasi su javni — bez prijave.</div>
                </li>
                <li className="rounded-2xl border bg-white p-4">
                  <div className="font-medium">2) Objavi ili pošalji poruku</div>
                  <div className="text-gray-600">Za objavu/poruke tražimo login.</div>
                </li>
                <li className="rounded-2xl border bg-white p-4">
                  <div className="font-medium">3) Dogovor</div>
                  <div className="text-gray-600">Sve ide direktno između ljudi.</div>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* KATEGORIJE BANNERI */}
        <div className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Kategorije</h2>
              <p className="text-sm text-gray-600">Klikni kategoriju i vidi oglase.</p>
            </div>
            <Link className="text-sm underline" href="/oglasi">
              Sve kategorije →
            </Link>
          </div>

          {loadingCats ? (
            <div className="mt-4 text-sm text-gray-600">Učitavam kategorije...</div>
          ) : topCats.length === 0 ? (
            <div className="mt-4 text-sm text-gray-600">Nema kategorija (provjeri tablicu categories).</div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topCats.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goToOglasi({ cat: String(c.id) })}
                  className="group relative overflow-hidden rounded-3xl border text-left shadow-sm"
                >
                  <div className="h-28 p-5 text-white" style={cardStyle(c.id)}>
                    <div className="text-sm/none opacity-90">Kategorija</div>
                    <div className="mt-2 text-2xl font-semibold">{c.name}</div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-4">
                    <div className="text-sm text-gray-600">Pogledaj oglase</div>
                    <div className="text-sm font-medium group-hover:underline">→</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CTA FOOTER */}
        <div className="mt-10 rounded-3xl border bg-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold">Spreman/na objaviti oglas?</div>
              <div className="text-sm text-gray-600">
                Novi oglas, poruke i profil su dostupni nakon prijave.
              </div>
            </div>
            <div className="flex gap-3">
              <Link className="rounded-xl bg-black px-5 py-3 text-white font-medium" href="/novi-oglas">
                Objavi oglas
              </Link>
              <button
                className="rounded-xl border px-5 py-3 font-medium"
                type="button"
                onClick={() => goToOglasi()}
              >
                Pregledaj oglase
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Usluge
        </div>
      </div>
    </div>
  );
}
