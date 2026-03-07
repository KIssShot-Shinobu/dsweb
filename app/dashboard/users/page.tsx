"use client";

import { UserManagementTable } from "@/components/dashboard/user-management-table";

export default function UsersPage() {
    return (
        <UserManagementTable
            title="Users"
            description="Satu halaman untuk registrasi user, member aktif, role, dan status akun."
            emptyTitle="Tidak ada user ditemukan"
            emptyDescription="Ubah filter status, role, atau kata kunci pencarian."
        />
    );
}
