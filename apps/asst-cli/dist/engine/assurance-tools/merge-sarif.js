/**
 * Merge multiple SARIF 2.1.0 logs into a single log with one run (concatenated results).
 * Used by the P2 static-analysis lane (e.g. Semgrep → SARIF).
 */
function collectRules(driver) {
    const map = new Map();
    for (const r of driver?.rules ?? []) {
        const id = typeof r.id === "string" ? r.id : undefined;
        if (id && !map.has(id))
            map.set(id, r);
    }
    return map;
}
/**
 * Merge SARIF logs. Empty input yields a minimal valid-shaped log with no results.
 */
export function mergeSarifLogs(logs) {
    if (logs.length === 0) {
        return {
            version: "2.1.0",
            $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            runs: [
                {
                    tool: {
                        driver: { name: "asst-merge", rules: [] },
                    },
                    results: [],
                },
            ],
        };
    }
    if (logs.length === 1) {
        const raw = logs[0];
        const runs = raw.runs?.length && raw.runs.length > 0
            ? raw.runs
            : [
                {
                    tool: { driver: { name: "unknown", rules: [] } },
                    results: [],
                },
            ];
        return {
            ...raw,
            version: raw.version ?? "2.1.0",
            runs,
        };
    }
    const ruleMap = new Map();
    const allResults = [];
    let version = "2.1.0";
    let schema;
    for (const log of logs) {
        if (typeof log.version === "string")
            version = log.version;
        if (typeof log.$schema === "string")
            schema = log.$schema;
        for (const run of log.runs ?? []) {
            const driver = run.tool?.driver;
            for (const [id, r] of collectRules(driver)) {
                if (!ruleMap.has(id))
                    ruleMap.set(id, r);
            }
            for (const res of run.results ?? []) {
                allResults.push(res);
            }
        }
    }
    const firstDriver = logs[0]?.runs?.[0]?.tool?.driver;
    const mergedDriver = {
        ...firstDriver,
        name: firstDriver?.name ?? "merged",
        rules: [...ruleMap.values()],
    };
    return {
        version,
        ...(schema ? { $schema: schema } : {}),
        runs: [
            {
                tool: { driver: mergedDriver },
                results: allResults,
            },
        ],
    };
}
export function parseSarifJson(raw) {
    if (raw === null || typeof raw !== "object") {
        throw new TypeError("SARIF root must be a JSON object");
    }
    return raw;
}
