import { redirect } from "next/navigation";

export default function MvzDashboardLegacyPage() {
  redirect("/mvz/metrics");
}
