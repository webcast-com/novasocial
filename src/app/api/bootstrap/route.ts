import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  try {
    const seedResult = await ensureSeeded();
    return NextResponse.json({ success: true, ...seedResult });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const seedResult = await ensureSeeded();
    return NextResponse.json({ success: true, ...seedResult });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
