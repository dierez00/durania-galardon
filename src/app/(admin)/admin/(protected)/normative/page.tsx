import { redirect } from "next/navigation";

export default function AdminNormativeRedirectPage() {
  redirect("/admin/settings?tab=overview");
}
