import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { writeFileSync } from "fs";

try {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [['Name', 'Email', 'Country']],
    body: [
      ['David', 'david@example.com', 'Sweden'],
      ['Castille', 'castille@example.com', 'Spain'],
    ],
  });
  const output = doc.output("arraybuffer");
  writeFileSync("test.pdf", Buffer.from(output));
  console.log("Successfully generated test.pdf");
} catch (error) {
  console.error("PDF generation failed:", error);
}
