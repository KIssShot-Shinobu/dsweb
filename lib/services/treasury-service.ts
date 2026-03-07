import type { TreasuryInput } from "@/lib/validators";

type TreasuryCreateResult = {
    id?: string;
    amount: number;
    description: string;
    userId: string | null;
    user?: { fullName: string } | null;
};

type TreasuryPrismaLike = {
    treasury: {
        create: (args: { data: { amount: number; description: string; userId: string | null }; include: { user: { select: { fullName: boolean } } } }) => Promise<TreasuryCreateResult>;
    };
};

export async function createTreasuryEntry(
    prisma: TreasuryPrismaLike,
    input: TreasuryInput
) {
    const finalAmount = normalizeTreasuryAmount(input.type, input.amount);

    return prisma.treasury.create({
        data: {
            amount: finalAmount,
            description: input.description,
            userId: input.userId || null,
        },
        include: {
            user: {
                select: {
                    fullName: true,
                },
            },
        },
    });
}

export function normalizeTreasuryAmount(type: TreasuryInput["type"], amount: number) {
    return type === "MASUK" ? Math.abs(amount) : -Math.abs(amount);
}
