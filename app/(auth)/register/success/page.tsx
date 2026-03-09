"use client";

import Link from "next/link";
import { AuthShell, authPrimaryBtnCls } from "@/components/auth/auth-shell";

export default function RegisterSuccessPage() {
    return (
        <AuthShell
            eyebrow="Akun Siap Digunakan"
            title="Pendaftaran Berhasil"
            description="Akun Anda sudah aktif dan siap dipakai untuk bergabung ke komunitas, melengkapi profil, dan mengikuti turnamen yang tersedia."
            footer={
                <Link href="/" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                    Kembali ke beranda
                </Link>
            }
        >
            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-3xl font-black text-emerald-400">
                    OK
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Akun aktif dan siap digunakan</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">
                    Masuk menggunakan email dan kata sandi yang baru Anda buat. Setelah itu, Anda bisa melengkapi identitas game dan mulai mengikuti aktivitas komunitas Duel Standby.
                </p>
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/10 px-4 py-3 text-sm font-medium text-emerald-300">
                    Status akun: aktif
                </div>
                <div className="mt-6">
                    <Link href="/login" className={authPrimaryBtnCls}>
                        Masuk Sekarang
                    </Link>
                </div>
            </div>
        </AuthShell>
    );
}
