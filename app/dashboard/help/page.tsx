import { dashboardStackCls } from "@/components/dashboard/form-styles";
import { DashboardPageHeader, DashboardPageShell, DashboardPanel } from "@/components/dashboard/page-shell";

export default function DashboardHelpPage() {
    return (
        <DashboardPageShell>
            <div className={dashboardStackCls}>
            <DashboardPageHeader
                kicker="Bantuan"
                title="Pusat Bantuan"
                description="Panduan singkat untuk mengelola roster, undangan, dan akses dashboard."
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <DashboardPanel title="Langkah Cepat" description="Checklist dasar sebelum mengelola team.">
                    <div className="space-y-3 text-sm text-base-content/70">
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                            Pastikan role Anda adalah Captain, Vice Captain, atau Manager agar bisa mengundang dan mengubah role member.
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                            Gunakan tab “Team Members” untuk mengatur role, dan tab “Owner Tools” untuk update logo/identitas team.
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                            Cek notifikasi untuk invite/join request agar roster tetap aktif dan teratur.
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel title="FAQ Singkat" description="Jawaban cepat untuk pertanyaan umum.">
                    <div className="space-y-3 text-sm text-base-content/70">
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                            <div className="font-semibold text-base-content">Kenapa tombol role tidak muncul?</div>
                            <div className="mt-1 text-sm text-base-content/60">
                                Role Anda belum punya izin. Minta Captain menaikkan role ke pengurus.
                            </div>
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                            <div className="font-semibold text-base-content">Invite sudah dikirim, tapi member belum masuk?</div>
                            <div className="mt-1 text-sm text-base-content/60">
                                Member harus menerima invite dari notifikasi atau halaman team.
                            </div>
                        </div>
                        <div className="rounded-box border border-base-300 bg-base-200/40 px-4 py-3">
                            <div className="font-semibold text-base-content">Logo team tidak berubah?</div>
                            <div className="mt-1 text-sm text-base-content/60">
                                Klik gambar untuk upload, lalu simpan perubahan di Owner Tools.
                            </div>
                        </div>
                    </div>
                </DashboardPanel>
            </div>
            </div>
        </DashboardPageShell>
    );
}
