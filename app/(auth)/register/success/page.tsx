"use client";

import Link from "next/link";

export default function RegisterSuccessPage() {
    return (
        <div className="w-full max-w-md mx-auto text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-2xl font-bold text-white mb-2">Pendaftaran Berhasil!</h1>
                <p className="text-white/50 text-sm leading-relaxed mb-6">
                    Akun Anda sudah aktif! Silakan login menggunakan email dan password yang sudah Anda daftarkan.
                </p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                    <p className="text-emerald-400 text-sm font-medium">✅ Akun Aktif — Siap Login</p>
                </div>
                <Link href="/login" className="inline-block w-full py-3 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-bold text-sm transition-all">
                    Login Sekarang →
                </Link>
            </div>
        </div>
    );
}
