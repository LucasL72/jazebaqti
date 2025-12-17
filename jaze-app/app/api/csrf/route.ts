import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = await issueCsrfToken();
  return NextResponse.json({ token });
}
