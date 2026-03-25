"use client";

import { UserManagementTable } from "@/components/dashboard/user-management-table";
import { useLocale } from "@/hooks/use-locale";

export default function UsersPage() {
    const { t } = useLocale();

    return (
        <UserManagementTable
            title={t.dashboard.users.title}
            description={t.dashboard.users.description}
            emptyTitle={t.dashboard.users.emptyTitle}
            emptyDescription={t.dashboard.users.emptyDescription}
        />
    );
}
