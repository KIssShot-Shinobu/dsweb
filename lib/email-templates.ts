type ActionEmailInput = {
    recipientName: string;
    preheader: string;
    title: string;
    body: string;
    actionLabel: string;
    actionUrl: string;
    expiryLabel?: string;
    fallbackLabel?: string;
};

type PaymentStatusEmailInput = {
    recipientName: string;
    tournamentTitle: string;
    status: "VERIFIED" | "REJECTED";
    actionUrl: string;
};

function getAppName() {
    return process.env.APP_NAME?.trim() || "Duel Standby";
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function buildActionEmail(input: ActionEmailInput) {
    const appName = getAppName();
    const fallbackLabel = input.fallbackLabel || "Jika tombol tidak bekerja, buka link berikut secara manual:";

    const text = [
        `Halo ${input.recipientName},`,
        "",
        input.body,
        "",
        `${input.actionLabel}: ${input.actionUrl}`,
        input.expiryLabel ? input.expiryLabel : null,
        "",
        fallbackLabel,
        input.actionUrl,
        "",
        `Salam,`,
        appName,
    ]
        .filter(Boolean)
        .join("\n");

    const html = `
        <div style="margin:0;padding:32px 16px;background:#0b0d11;font-family:Arial,Helvetica,sans-serif;color:#f8fafc;">
            <div style="margin:0 auto;max-width:640px;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#131821 0%,#0f1218 100%);box-shadow:0 30px 80px rgba(0,0,0,0.35);">
                <div style="padding:28px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.08);">
                    <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,201,22,0.1);border:1px solid rgba(255,201,22,0.18);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffc916;">
                        ${escapeHtml(input.preheader)}
                    </div>
                    <h1 style="margin:18px 0 0;font-size:30px;line-height:1.2;color:#ffffff;">
                        ${escapeHtml(input.title)}
                    </h1>
                    <p style="margin:16px 0 0;font-size:15px;line-height:1.75;color:rgba(248,250,252,0.72);">
                        Halo <strong style="color:#ffffff;">${escapeHtml(input.recipientName)}</strong>,<br /><br />
                        ${escapeHtml(input.body)}
                    </p>
                </div>

                <div style="padding:28px;">
                    <div style="margin-bottom:20px;">
                        <a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#ffc916;color:#111111;text-decoration:none;font-size:14px;font-weight:700;">
                            ${escapeHtml(input.actionLabel)}
                        </a>
                    </div>

                    ${
                        input.expiryLabel
                            ? `<div style="margin-bottom:20px;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);font-size:13px;line-height:1.7;color:rgba(248,250,252,0.68);">${escapeHtml(input.expiryLabel)}</div>`
                            : ""
                    }

                    <div style="padding:16px;border-radius:18px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
                        <div style="margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.42);">
                            ${escapeHtml(fallbackLabel)}
                        </div>
                        <div style="word-break:break-all;font-size:13px;line-height:1.7;color:#ffc916;">
                            ${escapeHtml(input.actionUrl)}
                        </div>
                    </div>
                </div>

                <div style="padding:18px 28px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;line-height:1.7;color:rgba(248,250,252,0.44);">
                    Email ini dikirim oleh ${escapeHtml(appName)}. Jika Anda tidak mengenali permintaan ini, Anda bisa mengabaikannya.
                </div>
            </div>
        </div>
    `.trim();

    return { text, html };
}

export function buildPaymentStatusEmail(input: PaymentStatusEmailInput) {
    const statusLabel = input.status === "VERIFIED" ? "terverifikasi" : "ditolak";
    const preheader = "Status Pembayaran Turnamen";
    const title = `Pembayaran ${statusLabel}`;
    const body =
        input.status === "VERIFIED"
            ? `Pembayaran untuk turnamen ${input.tournamentTitle} sudah diverifikasi. Kamu sudah resmi terdaftar sebagai peserta.`
            : `Pembayaran untuk turnamen ${input.tournamentTitle} ditolak. Silakan upload ulang bukti pembayaran agar pendaftaran dapat diproses.`;

    return buildActionEmail({
        recipientName: input.recipientName,
        preheader,
        title,
        body,
        actionLabel: "Lihat Turnamen",
        actionUrl: input.actionUrl,
    });
}
