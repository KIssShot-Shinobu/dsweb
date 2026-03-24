export const TREASURY_CATEGORIES = [
    "ENTRY_FEE",
    "SPONSORSHIP",
    "DONATION",
    "MERCH",
    "PRIZE_PAYOUT",
    "OPERATIONS",
    "MARKETING",
    "EQUIPMENT",
    "PLATFORM_FEES",
    "OTHER",
] as const;

export const TREASURY_METHODS = ["CASH", "BANK_TRANSFER", "EWALLET", "GATEWAY", "OTHER"] as const;

export const TREASURY_STATUS = ["PENDING", "CLEARED", "VOID"] as const;

export const TREASURY_CATEGORY_LABELS: Record<(typeof TREASURY_CATEGORIES)[number], string> = {
    ENTRY_FEE: "Entry Fee",
    SPONSORSHIP: "Sponsorship",
    DONATION: "Donation",
    MERCH: "Merch",
    PRIZE_PAYOUT: "Prize Payout",
    OPERATIONS: "Operations",
    MARKETING: "Marketing",
    EQUIPMENT: "Equipment",
    PLATFORM_FEES: "Platform Fees",
    OTHER: "Other",
};

export const TREASURY_METHOD_LABELS: Record<(typeof TREASURY_METHODS)[number], string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
    EWALLET: "E-Wallet",
    GATEWAY: "Payment Gateway",
    OTHER: "Other",
};

export const TREASURY_STATUS_LABELS: Record<(typeof TREASURY_STATUS)[number], string> = {
    PENDING: "Pending",
    CLEARED: "Cleared",
    VOID: "Void",
};
