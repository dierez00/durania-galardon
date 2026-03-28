import { redirect } from "next/navigation";

export default function AdminAuditRedirectPage() {
  redirect("/admin/settings?tab=audit");
}
