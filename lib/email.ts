import nodemailer from "nodemailer";

type SendEmailInput = {
    to: string;
    subject: string;
    text: string;
    html?: string;
    debugTag?: string;
};

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return defaultValue;
}

export function useConsoleEmailMode(): boolean {
    return parseBooleanEnv(
        process.env.RESETPASSCONSOLE ?? process.env.resetpassconsole,
        true
    );
}

function getSmtpConfig() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = parseBooleanEnv(process.env.SMTP_SECURE, false);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM || "DuelStandby <no-reply@localhost>";

    if (!host || !user || !pass) {
        throw new Error("SMTP config is incomplete. Please set SMTP_HOST, SMTP_USER, SMTP_PASS.");
    }

    return { host, port, secure, user, pass, from };
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
    if (useConsoleEmailMode()) {
        const tag = input.debugTag || "EMAIL";
        console.info(
            `[${tag}] To: ${input.to} | Subject: ${input.subject}\n${input.text}`
        );
        return;
    }

    const smtp = getSmtpConfig();
    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });

    await transporter.sendMail({
        from: smtp.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
    });
}

