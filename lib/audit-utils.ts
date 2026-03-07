export function stringifyDetails(data: Record<string, any>): string {
    if (!data) return '';

    const {
        password,
        pass,
        pwd,
        token,
        jwt,
        session,
        cookie,
        apiKey,
        secret,
        phoneWhatsapp,
        accountNumber,
        twoFactorSecret,
        creditCard,
        cvv,
        pin,
        ...safeData
    } = data;

    return JSON.stringify(safeData);
}

export function parseDetails(details: string | null): Record<string, any> {
    if (!details) return {};

    try {
        return JSON.parse(details);
    } catch (error) {
        console.error('[AuditUtils] Failed to parse details:', error);
        return {};
    }
}

export function validateSafeForLog(data: Record<string, any>): boolean {
    const sensitiveKeys = [
        'password', 'pass', 'pwd',
        'token', 'jwt', 'session',
        'cookie', 'apikey', 'secret',
        'creditcard', 'cvv', 'pin',
        'phonewhatsapp', 'accountnumber', 'twofactorsecret'
    ];

    const keys = Object.keys(data).map(k => k.toLowerCase());

    for (const key of sensitiveKeys) {
        if (keys.some(k => k.includes(key))) {
            console.warn('[AuditUtils] Sensitive data detected:', key);
            return false;
        }
    }
    return true;
}
