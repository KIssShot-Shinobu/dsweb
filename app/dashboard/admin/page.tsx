import { redirect } from "next/navigation";

export default function AdminPage() {
    // Legacy redirect: keep old admin dashboard URL alive.
    redirect("/dashboard");
}
