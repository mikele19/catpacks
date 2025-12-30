import { Suspense } from "react";
import AppShell from "./components/AppShell";

export default function Page() {
  return (
    // Suspense gestisce il caricamento mentre Next.js legge i parametri dell'URL (?invite=...)
    <Suspense fallback={<div className="min-h-screen w-full bg-yellow-400 flex items-center justify-center font-black">Caricamento...</div>}>
      <AppShell />
    </Suspense>
  );
}