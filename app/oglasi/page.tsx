import { Suspense } from "react";
import OglasiClient from "./OglasiClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Učitavam oglase...</div>}>
      <OglasiClient />
    </Suspense>
  );
}
