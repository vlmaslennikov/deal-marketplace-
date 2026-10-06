import { Suspense } from "react";
import { Workspace } from "@/shared/ui/workspace";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <Suspense fallback={<main>Loading marketplace…</main>}>
      <Workspace demoEnabled={process.env.DEMO_MODE === "true"} />
    </Suspense>
  );
}
