"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RegisterUploadField } from "@/components/auth/register-upload-field";
import { IndonesiaRegionFields } from "@/components/shared/indonesia-region-fields";
import {
    AuthShell,
    authAlertCls,
    authInputCls,
    authLabelCls,
    authPrimaryBtnCls,
    authSecondaryBtnCls,
} from "@/components/auth/auth-shell";
import {
    INITIAL_FORM,
    REGISTER_STEPS,
    SOCIAL_OPTIONS,
    SOURCE_OPTIONS,
    formatRegisterGameId,
    type RegistrationFormData,
    type UploadField,
    type UploadPreview,
    type UploadPreviewKey,
    validateRegisterStep,
} from "./register-form";

const errCls = "mt-1 text-xs text-red-400";

function getErrorStep(fieldErrors: Record<string, string>) {
    const stepFieldMap: Array<{ step: number; fields: string[] }> = [
        { step: 1, fields: ["username", "email", "password", "confirmPassword", "phoneWhatsapp", "provinceCode", "cityCode"] },
        { step: 2, fields: ["duelLinksGameId", "duelLinksIgn", "duelLinksScreenshotUploadId", "masterDuelGameId", "masterDuelIgn", "masterDuelScreenshotUploadId"] },
        { step: 3, fields: ["sourceInfo", "socialMedia"] },
        { step: 4, fields: ["agreement"] },
    ];

    const firstMatched = stepFieldMap.find((group) =>
        group.fields.some((field) => Object.prototype.hasOwnProperty.call(fieldErrors, field))
    );

    return firstMatched?.step ?? 1;
}

function CustomSelect({ value, onChange, options, placeholder, error }: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                    open ? "border-ds-amber bg-white/5 ring-4 ring-ds-amber/15" : error ? "border-red-500/40 bg-white/5" : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
            >
                <span className={value ? "text-white" : "text-white/30"}>{value || placeholder || "-- Pilih --"}</span>
                <svg className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open ? (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c] shadow-2xl">
                    {options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => {
                                onChange(option);
                                setOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-all ${
                                value === option ? "bg-ds-amber/15 font-medium text-ds-amber" : "text-white/70 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            {value === option ? <span className="text-xs">Dipilih</span> : null}
                            {option}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<RegistrationFormData>(INITIAL_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [uploading, setUploading] = useState<Record<UploadPreviewKey, boolean>>({ duelLinks: false, masterDuel: false });
    const [previews, setPreviews] = useState<Record<UploadPreviewKey, UploadPreview | null>>({ duelLinks: null, masterDuel: null });

    const setField = <Key extends keyof RegistrationFormData>(key: Key, value: RegistrationFormData[Key]) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const clearUpload = (previewKey: UploadPreviewKey, uploadField: UploadField) => {
        setField(uploadField, "");
        setPreviews((current) => ({ ...current, [previewKey]: null }));
    };

    const validate = (targetStep: number) => {
        const nextErrors = validateRegisterStep(form, targetStep);
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleUpload = async (file: File, uploadField: UploadField, previewKey: UploadPreviewKey) => {
        setUploading((current) => ({ ...current, [previewKey]: true }));
        setServerError(null);

        try {
            const payload = new FormData();
            payload.append("file", file);

            const response = await fetch("/api/upload/public", { method: "POST", body: payload });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Upload screenshot belum berhasil.");

            setField(uploadField, result.uploadId as string);
            setPreviews((current) => ({
                ...current,
                [previewKey]: { previewUrl: result.previewUrl as string, expiresAt: result.expiresAt as string },
            }));
        } catch (error) {
            setServerError(error instanceof Error ? error.message : "Upload screenshot belum berhasil.");
        } finally {
            setUploading((current) => ({ ...current, [previewKey]: false }));
        }
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!validate(4)) return;
        setSubmitting(true);
        setServerError(null);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const result = await response.json();

            if (result.success) {
                router.push("/register/success");
                return;
            }

            if (result.errors && typeof result.errors === "object") {
                const nextErrors: Record<string, string> = {};
                for (const [key, value] of Object.entries(result.errors as Record<string, string | string[]>)) {
                    nextErrors[key] = Array.isArray(value) ? value[0] : value;
                }
                setErrors(nextErrors);
                setStep(getErrorStep(nextErrors));
            }

            setServerError(result.message || "Pendaftaran belum berhasil diproses.");
        } catch {
            setServerError("Koneksi sedang bermasalah. Silakan coba lagi.");
        } finally {
            setSubmitting(false);
        }
    };

    const Err = ({ field }: { field: string }) => (errors[field] ? <p className={errCls}>{errors[field]}</p> : null);
    const progressPct = ((step - 1) / (REGISTER_STEPS.length - 1)) * 100;

    return (
        <AuthShell
            eyebrow="Pendaftaran Anggota"
            title="Buat akun Duel Standby"
            description="Lengkapi data inti Anda dalam beberapa langkah singkat untuk mulai terhubung dengan komunitas dan turnamen Duel Standby."
            footer={
                <>
                    Sudah punya akun?{" "}
                    <Link href="/login" className="font-semibold text-ds-amber transition-colors hover:text-ds-gold">
                        Masuk
                    </Link>
                </>
            }
        >
            <div className="mb-5 sm:mb-6">
                <div className="-mx-1 mb-3 flex items-start justify-between gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
                    {REGISTER_STEPS.map((item, index) => (
                        <div key={item.title} className="flex min-w-[72px] flex-1 flex-col items-center gap-2 sm:min-w-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-bold transition-all sm:h-10 sm:w-10 ${step === index + 1 ? "scale-105 bg-ds-amber text-black" : step > index + 1 ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400" : "border border-white/10 bg-white/5 text-white/30"}`}>
                                {step > index + 1 ? "OK" : item.icon}
                            </div>
                            <span className={`text-center text-[10px] font-medium ${step === index + 1 ? "text-ds-amber" : "text-white/30"}`}>{item.title}</span>
                        </div>
                    ))}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-ds-amber transition-all duration-500" style={{ width: `${progressPct + 33 / REGISTER_STEPS.length}%` }} />
                </div>
                <div className="mt-3 text-center text-[11px] text-white/40 sm:text-xs">Langkah {step} dari {REGISTER_STEPS.length} - {REGISTER_STEPS[step - 1].desc}</div>
            </div>

            {serverError ? <div className={`${authAlertCls} mb-5 border-red-500/20 bg-red-500/10 text-red-400`}>{serverError}</div> : null}

            <div className="rounded-[26px] border border-white/10 bg-black/10 p-3.5 sm:rounded-[28px] sm:p-5">
                {step === 1 ? (
                    <div className="space-y-3.5 sm:space-y-4">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
                            <div className="sm:col-span-2">
                                <label className={authLabelCls}>Username *</label>
                                <input type="text" className={authInputCls} placeholder="contoh: duelstandby.id" value={form.username} onChange={(event) => setField("username", event.target.value.toLowerCase())} />
                                <Err field="username" />
                                <p className="mt-1 text-xs text-white/30">Username akan digunakan untuk login bersama email. Gunakan 3-24 karakter tanpa spasi.</p>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={authLabelCls}>Email *</label>
                                <input type="email" className={authInputCls} placeholder="your@email.com" value={form.email} onChange={(event) => setField("email", event.target.value)} />
                                <Err field="email" />
                            </div>
                            <div>
                                <label className={authLabelCls}>Kata Sandi *</label>
                                <input type="password" className={authInputCls} placeholder="Minimal 8 karakter" value={form.password} onChange={(event) => setField("password", event.target.value)} />
                                <Err field="password" />
                            </div>
                            <div>
                                <label className={authLabelCls}>Konfirmasi Kata Sandi *</label>
                                <input type="password" className={authInputCls} placeholder="Ulangi kata sandi" value={form.confirmPassword} onChange={(event) => setField("confirmPassword", event.target.value)} />
                                <Err field="confirmPassword" />
                            </div>
                            <div>
                                <label className={authLabelCls}>WhatsApp *</label>
                                <input type="tel" className={authInputCls} placeholder="+628123456789" value={form.phoneWhatsapp} onChange={(event) => setField("phoneWhatsapp", event.target.value)} />
                                <Err field="phoneWhatsapp" />
                                <p className="mt-1 text-xs text-white/30">Gunakan format +62... atau 08...</p>
                            </div>
                            <div className="sm:col-span-2">
                                <IndonesiaRegionFields
                                    variant="auth"
                                    value={{
                                        provinceCode: form.provinceCode,
                                        provinceName: form.provinceName,
                                        cityCode: form.cityCode,
                                        cityName: form.cityName,
                                    }}
                                    onChange={(region) => {
                                        setField("provinceCode", region.provinceCode);
                                        setField("provinceName", region.provinceName);
                                        setField("cityCode", region.cityCode);
                                        setField("cityName", region.cityName);
                                    }}
                                    errors={{ provinceCode: errors.provinceCode, cityCode: errors.cityCode }}
                                />
                            </div>
                        </div>
                    </div>
                ) : null}

                {step === 2 ? (
                    <div className="space-y-4 sm:space-y-6">
                        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-white/45">
                            Lengkapi minimal satu profil game. Screenshot bersifat opsional dan hanya membantu proses verifikasi data game bila diperlukan.
                        </p>
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                            <h3 className="text-sm font-bold text-white">Duel Links</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={authLabelCls}>Game ID</label>
                                    <input type="text" inputMode="numeric" className={authInputCls} placeholder="123-456-789" value={form.duelLinksGameId} onChange={(event) => setField("duelLinksGameId", formatRegisterGameId(event.target.value))} />
                                </div>
                                <div>
                                    <label className={authLabelCls}>IGN</label>
                                    <input type="text" className={authInputCls} placeholder="Nama yang digunakan saat bermain" value={form.duelLinksIgn} onChange={(event) => setField("duelLinksIgn", event.target.value)} />
                                    <Err field="duelLinksIgn" />
                                </div>
                            </div>
                            <RegisterUploadField
                                label="Screenshot Profil (Opsional)"
                                helperText="Boleh dikosongkan. Jika diunggah, gunakan screenshot profil game yang jelas dan mudah dibaca."
                                preview={previews.duelLinks}
                                uploading={uploading.duelLinks}
                                error={errors.duelLinksScreenshotUploadId}
                                onUpload={(file) => handleUpload(file, "duelLinksScreenshotUploadId", "duelLinks")}
                                onClear={() => clearUpload("duelLinks", "duelLinksScreenshotUploadId")}
                            />
                        </div>
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 sm:p-4">
                            <h3 className="text-sm font-bold text-white">Master Duel</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={authLabelCls}>Game ID</label>
                                    <input type="text" inputMode="numeric" className={authInputCls} placeholder="123-456-789" value={form.masterDuelGameId} onChange={(event) => setField("masterDuelGameId", formatRegisterGameId(event.target.value))} />
                                </div>
                                <div>
                                    <label className={authLabelCls}>IGN</label>
                                    <input type="text" className={authInputCls} placeholder="Nama yang digunakan saat bermain" value={form.masterDuelIgn} onChange={(event) => setField("masterDuelIgn", event.target.value)} />
                                    <Err field="masterDuelIgn" />
                                </div>
                            </div>
                            <RegisterUploadField
                                label="Screenshot Profil (Opsional)"
                                helperText="Boleh dikosongkan. Jika diunggah, gunakan screenshot profil game yang jelas dan mudah dibaca."
                                preview={previews.masterDuel}
                                uploading={uploading.masterDuel}
                                error={errors.masterDuelScreenshotUploadId}
                                onUpload={(file) => handleUpload(file, "masterDuelScreenshotUploadId", "masterDuel")}
                                onClear={() => clearUpload("masterDuel", "masterDuelScreenshotUploadId")}
                            />
                        </div>
                        <Err field="duelLinksGameId" />
                    </div>
                ) : null}

                {step === 3 ? (
                    <div className="space-y-4">
                        <div>
                            <label className={authLabelCls}>Dari mana Anda mengenal Duel Standby? *</label>
                            <CustomSelect value={form.sourceInfo} onChange={(value) => setField("sourceInfo", value)} options={SOURCE_OPTIONS} placeholder="Pilih sumber informasi" error={errors.sourceInfo} />
                            <Err field="sourceInfo" />
                        </div>
                        <div>
                            <label className={authLabelCls}>Kanal komunitas apa yang paling aktif Anda gunakan? *</label>
                            <p className="mb-2 text-xs text-white/35">Pilih minimal satu kanal yang paling sering Anda gunakan untuk berkomunikasi.</p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {SOCIAL_OPTIONS.map((option) => (
                                    <div key={option} onClick={() => setField("socialMedia", form.socialMedia.includes(option) ? form.socialMedia.filter((item) => item !== option) : [...form.socialMedia, option])} className={`cursor-pointer rounded-2xl border px-3 py-2 text-xs font-medium transition-all ${form.socialMedia.includes(option) ? "border-ds-amber bg-ds-amber/10 text-ds-amber" : "border-white/10 text-white/40 hover:border-white/20"}`}>
                                        {option}
                                    </div>
                                ))}
                            </div>
                            <Err field="socialMedia" />
                        </div>
                    </div>
                ) : null}

                {step === 4 ? (
                    <div className="space-y-4">
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                            <p className="font-semibold text-white">Konfirmasi Pendaftaran</p>
                            <p>Pastikan seluruh data di bawah sudah benar sebelum akun Anda dibuat.</p>
                            <div className="grid grid-cols-1 gap-2 text-xs text-white/45 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                                    Data akun sudah benar
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                                    Profil game adalah milik Anda
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                                    Siap mengikuti aturan komunitas
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-sm text-white/50">Ringkasan pendaftaran:</p>
                            <div className="space-y-1 rounded-2xl bg-white/5 p-4 text-xs">
                                <div className="flex justify-between gap-4"><span className="text-white/40">Username</span><span className="font-medium text-white">@{form.username}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-white/40">Email</span><span className="text-white">{form.email}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-white/40">Provinsi</span><span className="text-white">{form.provinceName || "-"}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-white/40">Kab/Kota</span><span className="text-white">{form.cityName || "-"}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-white/40">Sumber info</span><span className="text-white">{form.sourceInfo}</span></div>
                                <div className="flex justify-between gap-4"><span className="text-white/40">Sosial media aktif</span><span className="text-right text-white">{form.socialMedia.join(", ")}</span></div>
                                {form.duelLinksIgn ? <div className="flex justify-between gap-4"><span className="text-white/40">DL IGN</span><span className="font-mono text-ds-amber">{form.duelLinksIgn}</span></div> : null}
                                {form.masterDuelIgn ? <div className="flex justify-between gap-4"><span className="text-white/40">MD IGN</span><span className="font-mono text-ds-amber">{form.masterDuelIgn}</span></div> : null}
                            </div>
                        </div>
                        <div onClick={() => setField("agreement", !form.agreement)} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-all ${form.agreement ? "border-ds-amber bg-ds-amber/10" : "border-white/10 hover:border-white/20"}`}>
                            <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${form.agreement ? "border-ds-amber bg-ds-amber text-black" : "border-white/30"}`}>
                                {form.agreement ? <span className="text-xs font-bold">Ya</span> : null}
                            </div>
                            <p className="text-sm text-white/70">Saya menyatakan data yang saya kirim sudah benar, profil game tersebut milik saya, dan saya siap mengikuti aturan Duel Standby serta event yang saya ikuti.</p>
                        </div>
                        <Err field="agreement" />
                    </div>
                ) : null}
            </div>

            <div className="sticky bottom-3 z-10 mt-5 rounded-[24px] border border-white/10 bg-[#121212]/90 p-3 backdrop-blur sm:static sm:mt-5 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="flex flex-col gap-3 sm:flex-row">
                {step > 1 ? <button type="button" onClick={() => setStep((current) => current - 1)} className={authSecondaryBtnCls}>Kembali</button> : null}
                {step < 4 ? (
                    <button type="button" onClick={() => { if (validate(step)) setStep((current) => current + 1); }} className={authPrimaryBtnCls}>
                        Lanjutkan
                    </button>
                ) : (
                    <button type="button" onClick={handleSubmit} disabled={submitting} className={authPrimaryBtnCls}>
                        {submitting ? "Mengirim pendaftaran..." : "Kirim Pendaftaran"}
                    </button>
                )}
                </div>
            </div>
        </AuthShell>
    );
}





