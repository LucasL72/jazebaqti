import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/csrf";

export async function GET() {
  const token = issueCsrfToken();
  const response = NextResponse.json({ token });

  return response;
}
