import type { TreasuryInput } from "@/lib/validators";

type TreasuryPrismaLike = {
    treasury: {
        create: (args: any) => Promise<any>;
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
