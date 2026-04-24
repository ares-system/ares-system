import { NextRequest, NextResponse } from "next/server";
import { createPublicOrchestrator } from "@/lib/engine-factory";
import { join } from "node:path";

export async function GET(req: NextRequest) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send = async (data: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Start the background process
  (async () => {
    try {
      const repoRoot = join(process.cwd(), "../..");
      const orchestrator = createPublicOrchestrator({ repoRoot });
      await orchestrator.init();

      // For this production demo, we simulate a stream of current system activity
      // coupled with real chat history.
      const history = await (orchestrator as any).persistence.getHistory(20);
      for (const msg of history.reverse()) {
        await send({
          type: 'log',
          source: msg.role === 'user' ? 'Operator' : 'ARES',
          level: msg.role === 'user' ? 'info' : 'security',
          message: msg.content,
          timestamp: msg.timestamp
        });
        await new Promise(r => setTimeout(r, 100));
      }

      // Keep connection open with heartbeats
      const interval = setInterval(async () => {
        try {
          await send({ type: 'heartbeat', timestamp: new Date().toISOString() });
        } catch {
          clearInterval(interval);
        }
      }, 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        writer.close();
      });

    } catch (err) {
      console.error("SSE Error:", err);
      try {
        await send({ type: 'error', message: 'Failed to initialize engine stream.' });
      } catch {}
      writer.close();
    }
  })();

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
