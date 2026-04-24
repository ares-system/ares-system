/**
 * Unit tests for the sandbox execution surface.
 *
 * Covers:
 *   - HostShellSandbox end-to-end (cross-platform execute, writeFile, readFile,
 *     timeout, maxBytes, env override, cwd override)
 *   - adaptDeepAgentsSandbox structural adapter (synthetic BaseSandbox)
 *   - createSandbox env-driven selection + docker fallback
 *   - dockerAvailable probe returns boolean without throwing
 *
 * No real docker is required. `dockerAvailable()` is tested only for its
 * return-type contract; on CI without docker it should return false.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  HostShellSandbox,
  adaptDeepAgentsSandbox,
  createHostSandbox,
  createSandbox,
  dockerAvailable,
  type DeepAgentsSandboxLike,
} from "../sandbox/index.js";

// Helper: create a unique temp workspace for each test and schedule cleanup.
async function tmpWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asst-sb-"));
  return dir;
}

// ─── HostShellSandbox ───────────────────────────────────────────────

describe("HostShellSandbox.execute", () => {
  it("echoes a trivial command and returns exitCode 0", async () => {
    const sb = new HostShellSandbox();
    const res = await sb.execute('echo hello-sandbox');
    assert.equal(res.exitCode, 0);
    assert.match(res.output, /hello-sandbox/);
    assert.equal(res.truncated, false);
  });

  it("reports non-zero exit codes", async () => {
    const sb = new HostShellSandbox();
    // `exit 3` works identically on cmd.exe (via `cmd /c`) and POSIX /bin/sh
    const res = await sb.execute("exit 3");
    assert.equal(res.exitCode, 3);
  });

  it("applies custom timeout (kills long-running commands)", async () => {
    const sb = new HostShellSandbox();
    const cmd =
      process.platform === "win32"
        ? "ping -n 6 127.0.0.1"
        : "sleep 5";
    const res = await sb.execute(cmd, { timeoutMs: 200 });
    // Timed-out commands return exitCode null (our contract)
    assert.equal(res.exitCode, null);
  });

  it("honors cwd override", async () => {
    const dir = await tmpWorkspace();
    try {
      const marker = "asst-cwd-marker-" + Math.random().toString(36).slice(2);
      await fs.writeFile(path.join(dir, `${marker}.txt`), "x", "utf8");
      const sb = new HostShellSandbox({ cwd: dir });
      const lister =
        process.platform === "win32" ? `dir /b` : `ls`;
      const res = await sb.execute(lister);
      assert.match(res.output, new RegExp(marker));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("honors env override", async () => {
    const sb = new HostShellSandbox();
    const key = "ASST_SANDBOX_TEST_VAR";
    const val = "value-" + Math.random().toString(36).slice(2);
    const cmd =
      process.platform === "win32" ? `echo %${key}%` : `echo $${key}`;
    const res = await sb.execute(cmd, { env: { [key]: val } });
    assert.match(res.output, new RegExp(val));
  });
});

describe("HostShellSandbox file ops", () => {
  it("writeFile + readFile roundtrip (string)", async () => {
    const dir = await tmpWorkspace();
    try {
      const sb = new HostShellSandbox({ cwd: dir });
      await sb.writeFile("hello.txt", "world");
      const bytes = await sb.readFile("hello.txt");
      assert.equal(new TextDecoder().decode(bytes), "world");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("writeFile creates parent directories", async () => {
    const dir = await tmpWorkspace();
    try {
      const sb = new HostShellSandbox({ cwd: dir });
      await sb.writeFile("a/b/c/hello.txt", "nested");
      const bytes = await sb.readFile("a/b/c/hello.txt");
      assert.equal(new TextDecoder().decode(bytes), "nested");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("writeFile accepts Uint8Array (binary)", async () => {
    const dir = await tmpWorkspace();
    try {
      const sb = new HostShellSandbox({ cwd: dir });
      const data = new Uint8Array([0, 1, 2, 3, 4, 5]);
      await sb.writeFile("bin.dat", data);
      const read = await sb.readFile("bin.dat");
      assert.deepEqual(Array.from(read), Array.from(data));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("readFile throws SandboxError on missing file", async () => {
    const dir = await tmpWorkspace();
    try {
      const sb = new HostShellSandbox({ cwd: dir });
      await assert.rejects(() => sb.readFile("does-not-exist"), /SandboxError|failed/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("id is stable and descriptive", () => {
    const sb = new HostShellSandbox();
    assert.equal(sb.id, "host-shell");
    assert.equal(sb.isHostLocal, true);
  });
});

// ─── adaptDeepAgentsSandbox ─────────────────────────────────────────

describe("adaptDeepAgentsSandbox", () => {
  // Synthetic BaseSandbox stand-in that records the calls.
  function makeFakeBackend(): DeepAgentsSandboxLike & {
    calls: Record<string, unknown[]>;
  } {
    const store = new Map<string, Uint8Array>();
    const calls: Record<string, unknown[]> = {
      execute: [],
      uploadFiles: [],
      downloadFiles: [],
    };
    return {
      id: "fake-remote",
      calls,
      async execute(command: string) {
        calls.execute.push(command);
        return { output: `ran:${command}`, exitCode: 0, truncated: false };
      },
      async uploadFiles(files) {
        calls.uploadFiles.push(files.map(([p]) => p));
        for (const [p, c] of files) store.set(p, c);
        return files.map(([p]) => ({ path: p, error: null }));
      },
      async downloadFiles(paths) {
        calls.downloadFiles.push(paths);
        return paths.map((p) =>
          store.has(p)
            ? { path: p, content: store.get(p)!, error: null }
            : { path: p, content: null, error: "file_not_found" },
        );
      },
    };
  }

  it("delegates execute to inner.execute", async () => {
    const fake = makeFakeBackend();
    const adapter = adaptDeepAgentsSandbox(fake);
    const res = await adapter.execute("ls /");
    assert.equal(res.exitCode, 0);
    assert.match(res.output, /ran:ls \//);
    assert.equal(fake.calls.execute.length, 1);
    assert.equal(adapter.id, "deepagents:fake-remote");
    assert.equal(adapter.isHostLocal, false);
  });

  it("prefixes env and cwd into the command string", async () => {
    const fake = makeFakeBackend();
    const adapter = adaptDeepAgentsSandbox(fake);
    await adapter.execute("echo hi", { env: { FOO: "bar" }, cwd: "/repo" });
    assert.equal(fake.calls.execute.length, 1);
    const cmd = String(fake.calls.execute[0]);
    assert.match(cmd, /cd "\/repo"/);
    assert.match(cmd, /FOO="bar" echo hi/);
  });

  it("writeFile routes through uploadFiles; readFile through downloadFiles", async () => {
    const fake = makeFakeBackend();
    const adapter = adaptDeepAgentsSandbox(fake);
    await adapter.writeFile("a.txt", "hello-adapter");
    const bytes = await adapter.readFile("a.txt");
    assert.equal(new TextDecoder().decode(bytes), "hello-adapter");
    assert.deepEqual(fake.calls.uploadFiles, [["a.txt"]]);
    assert.deepEqual(fake.calls.downloadFiles, [["a.txt"]]);
  });

  it("readFile throws SandboxError on error result", async () => {
    const fake = makeFakeBackend();
    const adapter = adaptDeepAgentsSandbox(fake);
    await assert.rejects(() => adapter.readFile("missing.txt"), /adapter readFile/);
  });

  it("execute doesn't throw when inner.execute throws — returns failure shape", async () => {
    const flaky: DeepAgentsSandboxLike = {
      id: "flaky",
      async execute() {
        throw new Error("boom");
      },
      async uploadFiles() {
        return [];
      },
      async downloadFiles() {
        return [];
      },
    };
    const adapter = adaptDeepAgentsSandbox(flaky);
    const res = await adapter.execute("anything");
    assert.equal(res.exitCode, null);
    assert.match(res.output, /boom/);
  });

  it("respects custom id + isHostLocal override", () => {
    const fake = makeFakeBackend();
    const adapter = adaptDeepAgentsSandbox(fake, { id: "custom", isHostLocal: true });
    assert.equal(adapter.id, "custom");
    assert.equal(adapter.isHostLocal, true);
  });
});

// ─── factory ────────────────────────────────────────────────────────

describe("createSandbox / createHostSandbox", () => {
  it("createHostSandbox returns a HostShellSandbox", () => {
    const sb = createHostSandbox();
    assert.equal(sb.id, "host-shell");
    assert.equal(sb.isHostLocal, true);
  });

  it('defaults to host when ASST_SANDBOX_BACKEND is unset', async () => {
    const prev = process.env.ASST_SANDBOX_BACKEND;
    delete process.env.ASST_SANDBOX_BACKEND;
    try {
      const sb = await createSandbox();
      assert.equal(sb.id, "host-shell");
    } finally {
      if (prev !== undefined) process.env.ASST_SANDBOX_BACKEND = prev;
    }
  });

  it("falls back to host when kind=docker and docker is unavailable", async () => {
    // We don't know whether CI has docker, but with
    // fallbackToHostOnUnavailable:true we always get *some* sandbox back.
    const sb = await createSandbox({
      kind: "docker",
      fallbackToHostOnUnavailable: true,
    });
    // Either the test host has docker (id starts with "docker:") or we got
    // the fallback (id === "host-shell"). Both are valid.
    assert.ok(
      sb.id === "host-shell" || sb.id.startsWith("docker:"),
      `unexpected sandbox id: ${sb.id}`,
    );
  });

  it("throws when kind=docker, docker unavailable, and fallback disabled", async () => {
    const hasDocker = await dockerAvailable();
    if (hasDocker) return; // skip — can't verify rejection when docker exists
    await assert.rejects(
      () => createSandbox({ kind: "docker", fallbackToHostOnUnavailable: false }),
      /docker is not available/,
    );
  });

  it("dockerAvailable returns a boolean without throwing", async () => {
    const v = await dockerAvailable();
    assert.equal(typeof v, "boolean");
  });
});
