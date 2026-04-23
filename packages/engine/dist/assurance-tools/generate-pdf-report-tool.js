import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
const schema = z.object({
    repoRoot: z.string().describe("Git repository root"),
    findings: z.array(z.object({
        severity: z.string(),
        title: z.string(),
        layer: z.string(),
        tool: z.string(),
        description: z.string().optional(),
        remediation: z.string().optional(),
    })).describe("List of findings to include in the report"),
    summary: z.string().optional().describe("Overall executive summary"),
    outDir: z.string().optional().describe("Directory to save the PDF (relative to repo root)"),
});
/**
 * Generates a "Premium" style PDF security report.
 */
export const generatePdfReportTool = tool(async (input) => {
    const repoName = basename(input.repoRoot);
    const fileName = `${repoName}_security_report.pdf`;
    // Try multiple output locations — OneDrive often blocks mkdir
    const { tmpdir } = await import("node:os");
    const candidates = [
        join(input.repoRoot, ".asst", "reports"),
        join(tmpdir(), "ares-reports"),
        join(process.env.USERPROFILE || process.env.HOME || tmpdir(), "ares-reports"),
    ];
    let outDir = candidates[0];
    for (const dir of candidates) {
        try {
            if (!existsSync(dir))
                mkdirSync(dir, { recursive: true });
            // Test write access
            const testFile = join(dir, ".write-test");
            writeFileSync(testFile, "ok");
            const { unlinkSync } = await import("node:fs");
            unlinkSync(testFile);
            outDir = dir;
            break;
        }
        catch {
            continue; // try next candidate
        }
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    // -- Header --
    doc.setFillColor(30, 30, 28); // Brand dark color
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(250, 249, 245); // Brand parchment color
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ARES SECURITY ASSURANCE REPORT", 15, 25);
    doc.setFontSize(10);
    doc.text(`Target Repository: ${repoName}`, 15, 33);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 15, 33, { align: "right" });
    // -- Executive Summary --
    let y = 55;
    doc.setTextColor(30, 30, 28);
    doc.setFontSize(16);
    doc.text("Executive Summary", 15, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(input.summary ?? "Full security posture analysis completed across 8 layers of protection.", pageWidth - 30);
    doc.text(summaryLines, 15, y);
    y += (summaryLines.length * 5) + 15;
    // -- Findings Table --
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Findings", 15, y);
    y += 8;
    const tableData = input.findings.map((f) => [
        f.severity.toUpperCase(),
        f.title,
        f.layer,
        f.tool
    ]);
    autoTable(doc, {
        startY: y,
        head: [["Severity", "Finding", "Layer", "Tool"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [45, 45, 43] },
        columnStyles: {
            0: { fontStyle: "bold" },
        },
        didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 0) {
                const val = data.cell.raw.toLowerCase();
                if (val === "critical")
                    data.cell.styles.textColor = [200, 50, 50];
                if (val === "high")
                    data.cell.styles.textColor = [200, 100, 50];
            }
        }
    });
    const finalY = doc.lastAutoTable.finalY + 20;
    // -- Remediation Tips --
    if (finalY < 250) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Recommendations:", 15, finalY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("- Rotate any identified secrets immediately.", 15, finalY + 8);
        doc.text("- Enforce signer checks on all administrative instructions.", 15, finalY + 14);
        doc.text("- Review transitive dependencies identified by pnpm audit.", 15, finalY + 20);
    }
    const filePath = join(outDir, fileName);
    const pdfOutput = doc.output("arraybuffer");
    writeFileSync(filePath, Buffer.from(pdfOutput));
    return `Successfully generated PDF report: ${fileName} in ${outDir}`;
}, {
    name: "generate_pdf_report",
    description: "Generate a finalized PDF security report for the repository.",
    schema,
});
