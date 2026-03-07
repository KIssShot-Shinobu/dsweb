import { redirect } from "next/navigation";

export default function MembersPage() {
    // Legacy redirect: keep old members URL alive.
    redirect("/dashboard/users?status=ACTIVE");
}
