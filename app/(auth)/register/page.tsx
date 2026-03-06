"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const inputCls = "w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 outline-none focus:border-ds-amber focus:ring-2 focus:ring-ds-amber/20 transition-all";
const labelCls = "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5";
const errCls = "text-xs text-red-400 mt-1";

// Custom Select component — fully dark-themed, no native browser dropdown
function CustomSelect({ value, onChange, options, placeholder, error }: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-left flex items-center justify-between transition-all ${open ? "border-ds-amber ring-2 ring-ds-amber/20 bg-white/5" : error ? "border-red-500/40 bg-white/5" : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
            >
                <span className={value ? "text-white" : "text-white/30"}>
                    {value || placeholder || "-- Pilih --"}
                </span>
                <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/10 bg-[#1c1c1c] shadow-2xl overflow-hidden">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => { onChange(opt); setOpen(false); }}
                            className={`w-full px-4 py-2.5 text-sm text-left transition-all flex items-center gap-2 ${value === opt
                                ? "bg-ds-amber/15 text-ds-amber font-medium"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            {value === opt && <span className="text-xs text-ds-amber">✓</span>}
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

type FormData = {
    // Step 1
    fullName: string; email: string; password: string; confirmPassword: string; phoneWhatsapp: string; city: string;
    // Step 2
    duelLinksGameId: string; duelLinksIgn: string; duelLinksScreenshot: string;
    masterDuelGameId: string; masterDuelIgn: string; masterDuelScreenshot: string;
    // Step 3
    sourceInfo: string; prevGuild: string; guildStatus: string; socialMedia: string[];
    // Step 4
    agreement: boolean;
};

const INITIAL: FormData = {
    fullName: "", email: "", password: "", confirmPassword: "", phoneWhatsapp: "", city: "",
    duelLinksGameId: "", duelLinksIgn: "", duelLinksScreenshot: "",
    masterDuelGameId: "", masterDuelIgn: "", masterDuelScreenshot: "",
    sourceInfo: "", prevGuild: "", guildStatus: "", socialMedia: [],
    agreement: false,
};

const SOCIAL_OPTIONS = ["WhatsApp", "Instagram", "Facebook", "TikTok", "Twitter/X", "YouTube", "Discord", "Friend Referral"];
const SOURCE_OPTIONS = ["Media sosial (Instagram/FB/TikTok)", "YouTube", "Discord", "Teman/Kenalan", "Tournament online", "Lainnya"];

const steps = [
    { title: "Akun", icon: "👤", desc: "Data akun Anda" },
    { title: "Game Profile", icon: "🎮", desc: "Profil game Duel Links / Master Duel" },
    { title: "Info Guild", icon: "🏆", desc: "Background guild Anda" },
    { title: "Persetujuan", icon: "📋", desc: "Syarat dan ketentuan" },
];

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(INITIAL);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [uploadingDL, setUploadingDL] = useState(false);
    const [uploadingMD, setUploadingMD] = useState(false);

    const set = (key: keyof FormData, value: unknown) => setForm((p) => ({ ...p, [key]: value }));

    const validate = (s: number): boolean => {
        const e: Record<string, string> = {};
        if (s === 1) {
            if (!form.fullName || form.fullName.length < 3) e.fullName = "Nama minimal 3 karakter";
            if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Email tidak valid";
            if (!form.password || form.password.length < 8) e.password = "Password minimal 8 karakter";
            if (!/[A-Za-z]/.test(form.password)) e.password = "Password harus mengandung huruf";
            if (!/[0-9]/.test(form.password)) e.password = "Password harus mengandung angka";
            if (form.password !== form.confirmPassword) e.confirmPassword = "Password tidak cocok";
            if (!form.phoneWhatsapp || !/^\+?[0-9]{10,15}$/.test(form.phoneWhatsapp)) e.phoneWhatsapp = "Nomor WhatsApp tidak valid";
            if (!form.city || form.city.length < 2) e.city = "Kota harus diisi";
        }
        if (s === 2) {
            const hasDL = form.duelLinksGameId && form.duelLinksIgn;
            const hasMD = form.masterDuelGameId && form.masterDuelIgn;
            if (!hasDL && !hasMD) e.duelLinksGameId = "Minimal satu game profile wajib diisi";
            if (form.duelLinksIgn && !/^\[DS\]/.test(form.duelLinksIgn)) e.duelLinksIgn = "IGN wajib diawali [DS]";
            if (form.masterDuelIgn && !/^\[DS\]/.test(form.masterDuelIgn)) e.masterDuelIgn = "IGN wajib diawali [DS]";
        }
        if (s === 3) {
            if (!form.sourceInfo) e.sourceInfo = "Sumber informasi harus diisi";
            if (!form.guildStatus) e.guildStatus = "Pilih status guild";
            if (form.socialMedia.length === 0) e.socialMedia = "Pilih minimal 1 sosial media";
        }
        if (s === 4) {
            if (!form.agreement) e.agreement = "Anda harus menyetujui pernyataan";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleUpload = async (file: File, field: "duelLinksScreenshot" | "masterDuelScreenshot") => {
        const setUploading = field === "duelLinksScreenshot" ? setUploadingDL : setUploadingMD;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload/public", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) set(field, data.url);
        } catch { /* continue */ } finally { setUploading(false); }
    };

    const handleNext = () => {
        if (validate(step)) setStep((s) => s + 1);
    };

    const handleSubmit = async () => {
        if (!validate(4)) return;
        setSubmitting(true);
        setServerError(null);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, socialMedia: form.socialMedia }),
            });
            const data = await res.json();
            if (data.success) {
                router.push("/register/success");
            } else {
                if (data.errors) {
                    const flatErr: Record<string, string> = {};
                    for (const [k, v] of Object.entries(data.errors)) flatErr[k] = Array.isArray(v) ? v[0] : String(v);
                    setErrors(flatErr);
                }
                setServerError(data.message || "Registrasi gagal.");
            }
        } catch { setServerError("Network error. Coba lagi."); }
        finally { setSubmitting(false); }
    };

    const Err = ({ field }: { field: string }) => errors[field] ? <p className={errCls}>{errors[field]}</p> : null;

    const progressPct = ((step - 1) / (steps.length - 1)) * 100;

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-ds-amber mb-3">
                    <span className="text-lg font-black text-black">DS</span>
                </div>
                <h1 className="text-xl font-bold text-white">Daftar ke Duel Standby</h1>
                <p className="text-sm text-white/40 mt-0.5">Isi form registrasi guild</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    {steps.map((s, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${step === i + 1 ? "bg-ds-amber text-black scale-110" : step > i + 1 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/30 border border-white/10"}`}>
                                {step > i + 1 ? "✓" : s.icon}
                            </div>
                            <span className={`text-[10px] font-medium hidden sm:block ${step === i + 1 ? "text-ds-amber" : "text-white/30"}`}>{s.title}</span>
                        </div>
                    ))}
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-ds-amber rounded-full transition-all duration-500" style={{ width: `${progressPct + (100 / (steps.length - 1)) / steps.length}%` }} />
                </div>
                <div className="text-center mt-2">
                    <span className="text-xs text-white/40">Step {step} dari {steps.length} — {steps[step - 1].desc}</span>
                </div>
            </div>

            {/* Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                {serverError && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{serverError}</div>
                )}

                {/* ── Step 1: Akun ── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Nama Lengkap *</label>
                                <input type="text" className={inputCls} placeholder="Nama lengkap sesuai KTP" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                                <Err field="fullName" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Email *</label>
                                <input type="email" className={inputCls} placeholder="your@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                                <Err field="email" />
                            </div>
                            <div>
                                <label className={labelCls}>Password *</label>
                                <input type="password" className={inputCls} placeholder="Min. 8 karakter" value={form.password} onChange={(e) => set("password", e.target.value)} />
                                <Err field="password" />
                            </div>
                            <div>
                                <label className={labelCls}>Konfirmasi Password *</label>
                                <input type="password" className={inputCls} placeholder="Ulangi password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
                                <Err field="confirmPassword" />
                            </div>
                            <div>
                                <label className={labelCls}>WhatsApp *</label>
                                <input type="tel" className={inputCls} placeholder="+628123456789" value={form.phoneWhatsapp} onChange={(e) => set("phoneWhatsapp", e.target.value)} />
                                <Err field="phoneWhatsapp" />
                                <p className="text-xs text-white/30 mt-1">Format: +62... atau 08...</p>
                            </div>
                            <div>
                                <label className={labelCls}>Kota *</label>
                                <input type="text" className={inputCls} placeholder="Jakarta, Surabaya, ..." value={form.city} onChange={(e) => set("city", e.target.value)} />
                                <Err field="city" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Game Profile ── */}
                {step === 2 && (
                    <div className="space-y-6">
                        <p className="text-xs text-white/40 bg-white/5 px-3 py-2 rounded-lg">Isi minimal satu game profile. IGN wajib diawali <span className="text-ds-amber font-mono">[DS]</span></p>

                        {/* Duel Links */}
                        <div className="border border-white/10 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">🃏 Duel Links</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Game ID</label>
                                    <input type="text" className={inputCls} placeholder="123456789" value={form.duelLinksGameId} onChange={(e) => set("duelLinksGameId", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>IGN</label>
                                    <input type="text" className={inputCls} placeholder="[DS]YourName" value={form.duelLinksIgn} onChange={(e) => set("duelLinksIgn", e.target.value)} />
                                    <Err field="duelLinksIgn" />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Screenshot Profil</label>
                                {form.duelLinksScreenshot ? (
                                    <div className="flex items-center gap-2">
                                        <img src={form.duelLinksScreenshot} className="h-16 rounded-lg object-cover" alt="preview" />
                                        <button onClick={() => set("duelLinksScreenshot", "")} className="text-xs text-red-400 hover:text-red-300">Hapus</button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-ds-amber/40 transition-all">
                                        <span className="text-xl">{uploadingDL ? "⏳" : "📷"}</span>
                                        <span className="text-xs text-white/40">{uploadingDL ? "Mengupload..." : "Upload screenshot"}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "duelLinksScreenshot"); }} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Master Duel */}
                        <div className="border border-white/10 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">⚡ Master Duel</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Game ID</label>
                                    <input type="text" className={inputCls} placeholder="MD-123456789" value={form.masterDuelGameId} onChange={(e) => set("masterDuelGameId", e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>IGN</label>
                                    <input type="text" className={inputCls} placeholder="[DS]YourName" value={form.masterDuelIgn} onChange={(e) => set("masterDuelIgn", e.target.value)} />
                                    <Err field="masterDuelIgn" />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Screenshot Profil</label>
                                {form.masterDuelScreenshot ? (
                                    <div className="flex items-center gap-2">
                                        <img src={form.masterDuelScreenshot} className="h-16 rounded-lg object-cover" alt="preview" />
                                        <button onClick={() => set("masterDuelScreenshot", "")} className="text-xs text-red-400 hover:text-red-300">Hapus</button>
                                    </div>
                                ) : (
                                    <label className="flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-ds-amber/40 transition-all">
                                        <span className="text-xl">{uploadingMD ? "⏳" : "📷"}</span>
                                        <span className="text-xs text-white/40">{uploadingMD ? "Mengupload..." : "Upload screenshot"}</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "masterDuelScreenshot"); }} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <Err field="duelLinksGameId" />
                    </div>
                )}

                {/* ── Step 3: Info Guild ── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className={labelCls}>Dari mana Anda mengetahui guild ini? *</label>
                            <CustomSelect
                                value={form.sourceInfo}
                                onChange={(v) => set("sourceInfo", v)}
                                options={SOURCE_OPTIONS}
                                placeholder="-- Pilih sumber informasi --"
                                error={errors.sourceInfo}
                            />
                            <Err field="sourceInfo" />
                        </div>
                        <div>
                            <label className={labelCls}>Guild sebelumnya (opsional)</label>
                            <input type="text" className={inputCls} placeholder="Nama guild sebelumnya" value={form.prevGuild} onChange={(e) => set("prevGuild", e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Status guild saat ini *</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[{ v: "SOLO_PLAYER", l: "Solo Player", desc: "Tidak dalam guild" }, { v: "LEFT_GUILD", l: "Keluar Guild", desc: "Pernah di guild lain" }, { v: "NEW_PLAYER", l: "Pemain Baru", desc: "Baru mulai" }].map((opt) => (
                                    <div key={opt.v} onClick={() => set("guildStatus", opt.v)} className={`p-3 rounded-xl border cursor-pointer transition-all ${form.guildStatus === opt.v ? "border-ds-amber bg-ds-amber/10" : "border-white/10 hover:border-white/20"}`}>
                                        <div className="text-sm font-semibold text-white">{opt.l}</div>
                                        <div className="text-xs text-white/40">{opt.desc}</div>
                                    </div>
                                ))}
                            </div>
                            <Err field="guildStatus" />
                        </div>
                        <div>
                            <label className={labelCls}>Aktif di sosial media mana? *</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {SOCIAL_OPTIONS.map((s) => (
                                    <div key={s} onClick={() => {
                                        const cur = form.socialMedia;
                                        set("socialMedia", cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
                                    }} className={`px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${form.socialMedia.includes(s) ? "border-ds-amber bg-ds-amber/10 text-ds-amber" : "border-white/10 text-white/40 hover:border-white/20"}`}>
                                        {s}
                                    </div>
                                ))}
                            </div>
                            <Err field="socialMedia" />
                        </div>
                    </div>
                )}

                {/* ── Step 4: Agreement ── */}
                {step === 4 && (
                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/70 space-y-2 max-h-48 overflow-y-auto">
                            <p className="font-semibold text-white">Pernyataan Anggota Duel Standby Guild</p>
                            <p>Dengan mendaftar, saya menyatakan bahwa:</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                                <li>Informasi yang saya berikan adalah <strong>benar dan akurat</strong>.</li>
                                <li>IGN di game menggunakan prefix <strong>[DS]</strong> sebagaimana ketentuan guild.</li>
                                <li>Saya bersedia mengikuti <strong>peraturan dan tata tertib</strong> guild.</li>
                                <li>Saya bersedia aktif berkontribusi dalam kegiatan guild.</li>
                                <li>Pelanggaran dapat berakibat pada <strong>dikeluarkan dari guild</strong>.</li>
                            </ol>
                        </div>

                        <div>
                            <p className="text-sm text-white/50 mb-2">Ringkasan pendaftaran Anda:</p>
                            <div className="bg-white/5 rounded-xl p-3 text-xs space-y-1">
                                <div className="flex justify-between"><span className="text-white/40">Nama</span><span className="text-white font-medium">{form.fullName}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Email</span><span className="text-white">{form.email}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Kota</span><span className="text-white">{form.city}</span></div>
                                {form.duelLinksIgn && <div className="flex justify-between"><span className="text-white/40">DL IGN</span><span className="text-ds-amber font-mono">{form.duelLinksIgn}</span></div>}
                                {form.masterDuelIgn && <div className="flex justify-between"><span className="text-white/40">MD IGN</span><span className="text-ds-amber font-mono">{form.masterDuelIgn}</span></div>}
                            </div>
                        </div>

                        <div onClick={() => set("agreement", !form.agreement)} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.agreement ? "border-ds-amber bg-ds-amber/10" : "border-white/10 hover:border-white/20"}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${form.agreement ? "bg-ds-amber border-ds-amber" : "border-white/30"}`}>
                                {form.agreement && <span className="text-black text-xs font-bold">✓</span>}
                            </div>
                            <p className="text-sm text-white/70">Saya telah membaca dan menyetujui seluruh pernyataan di atas, serta bersedia mengikuti peraturan guild Duel Standby.</p>
                        </div>
                        <Err field="agreement" />
                    </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 mt-6">
                    {step > 1 && (
                        <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white/60 hover:bg-white/5 transition-all">
                            ← Kembali
                        </button>
                    )}
                    {step < 4 ? (
                        <button onClick={handleNext} className="flex-1 py-2.5 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-bold text-sm transition-all">
                            Lanjut →
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-ds-amber hover:bg-ds-gold text-black font-bold text-sm transition-all disabled:opacity-50">
                            {submitting ? "Mendaftar..." : "Kirim Pendaftaran 🚀"}
                        </button>
                    )}
                </div>
            </div>

            <p className="text-center text-sm text-white/30 mt-4">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-ds-amber hover:text-ds-gold font-semibold transition-colors">Masuk</Link>
            </p>
        </div>
    );
}
