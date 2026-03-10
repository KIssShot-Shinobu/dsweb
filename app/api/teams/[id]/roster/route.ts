import { NextResponse } from "next/server";

const MESSAGE = "Roster team sekarang dikelola mandiri oleh pemain melalui halaman manage team.";

export async function POST() {
    return NextResponse.json({ success: false, message: MESSAGE }, { status: 403 });
}

export async function DELETE() {
    return NextResponse.json({ success: false, message: MESSAGE }, { status: 403 });
}
