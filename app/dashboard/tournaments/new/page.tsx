"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardPageHeader, DashboardPageShell } from "@/components/dashboard/page-shell";
import { btnOutline } from "@/components/dashboard/form-styles";
import { TournamentForm, buildTournamentPayload, getDefaultTournamentForm, type TournamentFormState } from "@/components/dashboard/tournament-form";
import { useToast } from "@/components/dashboard/toast";

export default function TournamentCreatePage() {
    const router = useRouter();
    const { success, error } = useToast();
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
                success("Gambar berhasil diupload.");
                return data.url as string;
            }
            error(data?.message || "Gagal upload gambar.");
        } catch {
            error("Kesalahan jaringan saat upload.");
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
                success("Turnamen berhasil dibuat.");
                router.push(`/dashboard/tournaments/${data?.tournament?.id ?? ""}`);
            } else {
                error(data.message || "Gagal membuat turnamen.");
            }
        } catch {
            error("Kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardPageShell>
            <div className="space-y-6">
                <DashboardPageHeader
                    kicker="Event Builder"
                    title="Buat Turnamen Baru"
                    description="Lengkapi detail turnamen sebelum dipublikasikan."
                    actions={
                        <Link href="/dashboard/tournaments" className={btnOutline}>
                            Kembali ke daftar
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
                    submitLabel="Buat Turnamen"
                />
            </div>
        </DashboardPageShell>
    );
}
