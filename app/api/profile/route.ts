import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/lib/audit-actions";
import { logAudit } from "@/lib/audit-logger";
import { getServerCurrentUser } from "@/lib/server-current-user";
import { profileUpdateSchema } from "@/lib/validators";
import { resolveIndonesiaRegionSelection } from "@/lib/indonesia-regions";

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getServerCurrentUser();

        if (!currentUser) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = profileUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: parsed.error.issues[0]?.message || "Data profil tidak valid",
                    errors: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const nextData = parsed.data;
        const domicileType = nextData.domicileType ?? (nextData.countryCode ? "INTL" : "ID");
        const isInternational = domicileType === "INTL";

        const resolvedRegion = isInternational
            ? null
            : await resolveIndonesiaRegionSelection(nextData.provinceCode || "", nextData.cityCode || "");

        const normalizedCountryCode = isInternational ? (nextData.countryCode || "").toUpperCase() : "ID";
        const normalizedCountryName = isInternational ? (nextData.countryName || "") : "Indonesia";

        const existingUser = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: {
                id: true,
                username: true,
                email: true,
                phoneWhatsapp: true,
                countryCode: true,
                countryName: true,
                provinceCode: true,
                provinceName: true,
                cityCode: true,
                city: true,
            },
        });

        if (!existingUser) {
            return NextResponse.json({ success: false, message: "User tidak ditemukan" }, { status: 404 });
        }

        const [usernameOwner, emailOwner, phoneOwner] = await Promise.all([
            prisma.user.findUnique({ where: { username: nextData.username }, select: { id: true } }),
            prisma.user.findUnique({ where: { email: nextData.email }, select: { id: true } }),
            prisma.user.findFirst({ where: { phoneWhatsapp: nextData.phoneWhatsapp }, select: { id: true } }),
        ]);

        if (usernameOwner && usernameOwner.id !== currentUser.id) {
            return NextResponse.json(
                { success: false, message: "Username sudah digunakan", errors: { username: ["Username sudah digunakan"] } },
                { status: 409 },
            );
        }

        if (emailOwner && emailOwner.id !== currentUser.id) {
            return NextResponse.json(
                { success: false, message: "Email sudah digunakan", errors: { email: ["Email sudah digunakan"] } },
                { status: 409 },
            );
        }

        if (phoneOwner && phoneOwner.id !== currentUser.id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Nomor WhatsApp sudah digunakan",
                    errors: { phoneWhatsapp: ["Nomor WhatsApp sudah digunakan"] },
                },
                { status: 409 },
            );
        }

        const emailChanged = existingUser.email !== nextData.email;
        const changedFields = [
            existingUser.username !== nextData.username ? "username" : null,
            emailChanged ? "email" : null,
            existingUser.phoneWhatsapp !== nextData.phoneWhatsapp ? "phoneWhatsapp" : null,
            existingUser.countryCode !== normalizedCountryCode ? "countryCode" : null,
            existingUser.countryName !== normalizedCountryName ? "countryName" : null,
            !isInternational && existingUser.provinceCode !== resolvedRegion?.provinceCode ? "provinceCode" : null,
            !isInternational && existingUser.provinceName !== resolvedRegion?.provinceName ? "provinceName" : null,
            !isInternational && existingUser.cityCode !== resolvedRegion?.cityCode ? "cityCode" : null,
            !isInternational && existingUser.city !== resolvedRegion?.cityName ? "city" : null,
        ].filter(Boolean) as string[];

        if (changedFields.length === 0) {
            return NextResponse.json({
                success: true,
                message: "Tidak ada perubahan pada profil akun.",
                user: {
                    username: existingUser.username,
                    email: existingUser.email,
                    phoneWhatsapp: existingUser.phoneWhatsapp,
                    countryCode: existingUser.countryCode,
                    countryName: existingUser.countryName,
                    provinceCode: existingUser.provinceCode,
                    provinceName: existingUser.provinceName,
                    cityCode: existingUser.cityCode,
                    city: existingUser.city,
                    emailVerificationReset: false,
                },
            });
        }

        const updatedUser = await prisma.$transaction(async (tx) => {
            if (emailChanged) {
                await tx.emailVerificationToken.deleteMany({ where: { userId: currentUser.id } });
            }

            return tx.user.update({
                where: { id: currentUser.id },
                data: {
                    username: nextData.username,
                    fullName: nextData.username,
                    email: nextData.email,
                    phoneWhatsapp: nextData.phoneWhatsapp,
                    countryCode: normalizedCountryCode,
                    countryName: normalizedCountryName,
                    provinceCode: isInternational ? null : resolvedRegion?.provinceCode,
                    provinceName: isInternational ? null : resolvedRegion?.provinceName,
                    cityCode: isInternational ? null : resolvedRegion?.cityCode,
                    city: isInternational ? null : resolvedRegion?.cityName,
                    ...(emailChanged ? { emailVerifiedAt: null } : {}),
                },
                select: {
                    username: true,
                    email: true,
                    phoneWhatsapp: true,
                    countryCode: true,
                    countryName: true,
                    provinceCode: true,
                    provinceName: true,
                    cityCode: true,
                    city: true,
                    emailVerifiedAt: true,
                },
            });
        });

        await logAudit({
            action: AUDIT_ACTIONS.PROFILE_UPDATED,
            userId: currentUser.id,
            targetId: currentUser.id,
            targetType: "User",
            details: {
                changedFields,
                emailChanged,
                phoneChanged: changedFields.includes("phoneWhatsapp"),
                verificationReset: emailChanged,
                regionChanged: changedFields.some((field) =>
                    ["provinceCode", "provinceName", "cityCode", "city", "countryCode", "countryName"].includes(field)
                ),
            },
        });

        return NextResponse.json({
            success: true,
            message: emailChanged ? "Profil berhasil diperbarui. Email perlu diverifikasi ulang." : "Profil berhasil diperbarui.",
            user: {
                username: updatedUser.username,
                email: updatedUser.email,
                phoneWhatsapp: updatedUser.phoneWhatsapp,
                countryCode: updatedUser.countryCode,
                countryName: updatedUser.countryName,
                provinceCode: updatedUser.provinceCode,
                provinceName: updatedUser.provinceName,
                cityCode: updatedUser.cityCode,
                city: updatedUser.city,
                emailVerificationReset: emailChanged,
            },
        });
    } catch (error) {
        if (error instanceof Error) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        console.error("[Profile API]", error);
        return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
