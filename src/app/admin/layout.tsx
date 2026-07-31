import { PermissionGuard } from "@/components/auth/PermissionGuard";
import AdminShell from "@/features/admin/components/AdminShell";
import { PERMISSIONS } from "@convex/lib/access";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard permission={PERMISSIONS.ADMIN_PANEL_ACCESS}>
      <AdminShell>{children}</AdminShell>
    </PermissionGuard>
  );
}
