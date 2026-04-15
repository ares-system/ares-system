import { writeAssuranceManifestTool } from "./examples/assurance-tools/write-assurance-manifest-tool.js";
import { join } from "path";

async function test() {
  const repoRoot = join(process.cwd(), "..");
  const result = await writeAssuranceManifestTool.invoke({
    repoRoot,
    deepagentsjsRoot: process.cwd(),
    noSupplyChain: true,
    noStaticAnalysis: true,
    notes: "Verification run after Windows pnpm fix",
  });
  console.log("Result:", result);
}

test();
