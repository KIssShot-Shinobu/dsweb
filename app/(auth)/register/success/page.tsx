"use client";

import Link from "next/link";
import { AuthShell, authPrimaryBtnCls } from "@/components/auth/auth-shell";

export default function RegisterSuccessPage() {
    return (
        <AuthShell
            eyebrow="Account Ready"
            title="Pendaftaran Berhasil"
            description="Akun publik Anda sudah aktif. Anda bisa langsung masuk, melengkapi profile, dan ikut tournament publik yang tersedia."
            footer={
                <Link href="/" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                    Kembali ke homepage
                </Link>
            }
        >
            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-3xl font-black text-emerald-400">
                    OK
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-tight text-white">Akun Aktif dan Siap Digunakan</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/55">
                    Login menggunakan email dan password yang baru Anda buat. Jika nanti Anda resmi bergabung ke Duel Standby, role komunitas dan team akan diatur terpisah dari halaman operasional.
                </p>
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/10 px-4 py-3 text-sm font-medium text-emerald-300">
                    Status akun: ACTIVE
                </div>
                <div className="mt-6">
                    <Link href="/login" className={authPrimaryBtnCls}>
                        Login Sekarang
                    </Link>
                </div>
            </div>
        </AuthShell>
    );
}
