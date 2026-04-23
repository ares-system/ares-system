import { NextResponse } from "next/server";
import { getAssuranceData } from "@/lib/data";

export async function GET() {
  const data = getAssuranceData();
  return NextResponse.json(data);
}
