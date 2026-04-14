import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") || "ASST";
  
  const fileName = `${repo} final analysis report.pdf`;
  const filePath = join(process.cwd(), "../../assurance", fileName);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to read report", details: error.message }, { status: 500 });
  }
}
