import { NextResponse } from "next/server";
import { getIndonesiaProvinces } from "@/lib/indonesia-regions";

export async function GET() {
    try {
        const provinces = await getIndonesiaProvinces();
        return NextResponse.json({ success: true, provinces });
    } catch (error) {
        console.error("[Regions API][Provinces]", error);
        return NextResponse.json({ success: false, message: "Gagal memuat data provinsi" }, { status: 500 });
    }
}
