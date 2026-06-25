import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey });
}
