"use client";

import { UserManagementTable } from "@/components/dashboard/user-management-table";

export default function UsersPage() {
    return (
        <UserManagementTable
            title="Users"
            description="Kelola akun publik, member Duel Standby, role komunitas, dan afiliasi team dari satu halaman."
            emptyTitle="Tidak ada user ditemukan"
            emptyDescription="Ubah filter status, role, team, atau kata kunci pencarian."
        />
    );
}
