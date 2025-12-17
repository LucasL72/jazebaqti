import { enforceAdminPageAccess } from "@/lib/admin-session";
import { AdminProfileClient } from "./AdminProfileClient";

export default async function AdminProfilePage() {
  await enforceAdminPageAccess("/admin/profile");

  return <AdminProfileClient />;
}
