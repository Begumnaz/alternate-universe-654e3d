import { NextResponse } from "next/server";
import { getAllLives } from "@/lib/store";

export async function GET() {
  const lives = getAllLives().map(({ id, createdAt, basePersonality, demographics }) => ({
    id,
    createdAt,
    basePersonality,
    demographics,
  }));
  return NextResponse.json({ lives });
}
