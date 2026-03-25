"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard/page-shell";
import { btnOutline } from "@/components/dashboard/form-styles";
import { TournamentForm, buildTournamentPayload, getDefaultTournamentForm, type TournamentFormState } from "@/components/dashboard/tournament-form";
import { useToast } from "@/components/dashboard/toast";
import { useLocale } from "@/hooks/use-locale";

export default function TournamentCreateClient() {
    const router = useRouter();
    const { success, error } = useToast();
    const { t } = useLocale();
    const [formData, setFormData] = useState<TournamentFormState>(() => getDefaultTournamentForm());
    const [uploadingImage, setUploadingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleUploadImage = async (file: File): Promise<string | null> => {
        setUploadingImage(true);
        try {
            const body = new FormData();
            body.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body,
            });
            const data = await res.json();

            if (res.ok && data?.url) {
                success(t.dashboard.tournamentCreate.success.upload);
                return data.url as string;
            }
            error(data?.message || t.dashboard.tournamentCreate.errors.uploadFailed);
        } catch {
            error(t.dashboard.tournamentCreate.errors.uploadNetwork);
        } finally {
            setUploadingImage(false);
        }
        return null;
    };

    const handleCreate = async (payload: TournamentFormState) => {
        setSubmitting(true);
        try {
            const body = buildTournamentPayload(payload);
            const res = await fetch("/api/tournaments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                success(t.dashboard.tournamentCreate.success.created);
                router.push(`/dashboard/tournaments/${data?.tournament?.id ?? ""}`);
            } else {
                error(data.message || t.dashboard.tournamentCreate.errors.createFailed);
            }
        } catch {
            error(t.dashboard.tournamentCreate.errors.network);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker={t.dashboard.tournamentCreate.kicker}
                    title={t.dashboard.tournamentCreate.title}
                    description={t.dashboard.tournamentCreate.description}
                    actions={
                        <Link href="/dashboard/tournaments" className={btnOutline}>
                            {t.dashboard.tournamentCreate.backToList}
                        </Link>
                    }
                />
                <TournamentForm
                    formData={formData}
                    setFormData={setFormData}
                    uploadingImage={uploadingImage}
                    submitting={submitting}
                    onUploadImage={handleUploadImage}
                    onSubmit={handleCreate}
                    submitLabel={t.dashboard.tournamentCreate.submit}
                />
            </div>
        </DashboardPageShell>
    );
}
