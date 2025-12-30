import { NextResponse } from "next/server";

const POSSIBLE_PORTS = [60886, 60885, 60887, 60888];

// Trouver le port actif du serveur Express
async function findExpressUrl(): Promise<string | null> {
  for (const port of POSSIBLE_PORTS) {
    try {
      const url = `http://localhost:${port}`;
      const response = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) {
        return url;
      }
    } catch {
      // Continue to next port
    }
  }
  return null;
}

export async function GET() {
  try {
    const expressUrl = await findExpressUrl();

    if (!expressUrl) {
      return NextResponse.json(
        {
          success: false,
          copilotAvailable: false,
          error: "VS Code extension server not found",
        },
        { status: 503 }
      );
    }

    const response = await fetch(`${expressUrl}/api/copilot/status`);
    
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          copilotAvailable: false,
          error: "Failed to get Copilot status",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        copilotAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
