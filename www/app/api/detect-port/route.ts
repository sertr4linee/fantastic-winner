import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Essayer plusieurs ports possibles
const POSSIBLE_PORTS = [60886, 60885, 60887, 60888];

async function findActivePort(): Promise<number | null> {
  for (const port of POSSIBLE_PORTS) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) {
        console.log(`[Detect Port] Found active server on port ${port}`);
        return port;
      }
    } catch {
      // Port not available, continue
    }
  }
  return null;
}

export async function GET() {
  const activePort = await findActivePort();
  
  if (activePort) {
    return NextResponse.json({
      success: true,
      port: activePort,
      url: `http://localhost:${activePort}`,
    });
  } else {
    return NextResponse.json({
      success: false,
      error: "No active Express server found",
      triedPorts: POSSIBLE_PORTS,
    }, { status: 404 });
  }
}
