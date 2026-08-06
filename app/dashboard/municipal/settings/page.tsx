import type { Metadata } from "next";

import MunicipalSettingsClient from "./components/MunicipalSettingsClient";

export const metadata: Metadata = {
  title: "Municipal Settings | PagTipon",
};

export default function MunicipalSettingsPage() {
  return <MunicipalSettingsClient />;
}
