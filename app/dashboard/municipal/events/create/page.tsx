import { Suspense } from "react";
import MunicipalEventForm from "./MunicipalEventForm";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading event form…</p>}>
      <MunicipalEventForm />
    </Suspense>
  );
}
