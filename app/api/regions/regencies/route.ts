import { NextRequest, NextResponse } from "next/server";
import { getIndonesiaCitiesByProvince } from "@/lib/indonesia-regions";

export async function GET(request: NextRequest) {
    const provinceCode = request.nextUrl.searchParams.get("provinceCode")?.trim() || "";

    if (!provinceCode) {
        return NextResponse.json({ success: false, message: "provinceCode wajib diisi" }, { status: 400 });
    }

    try {
        const regencies = await getIndonesiaCitiesByProvince(provinceCode);
        return NextResponse.json({ success: true, regencies });
    } catch (error) {
        console.error("[Regions API][Regencies]", error);
        return NextResponse.json({ success: false, message: "Gagal memuat data kabupaten / kota" }, { status: 500 });
    }
}
