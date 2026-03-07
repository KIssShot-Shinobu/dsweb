import { redirect } from "next/navigation";

export default function AdminUsersPage() {
    // Legacy redirect: keep old admin users URL alive.
    redirect("/dashboard/users");
}
