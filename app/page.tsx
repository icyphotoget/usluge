import { Suspense } from "react";
import LandingClient from "./LandingClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Učitavam...</div>}>
      <LandingClient />
    </Suspense>
  );
}
