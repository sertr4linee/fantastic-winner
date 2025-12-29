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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "No message provided" },
        { status: 400 }
      );
    }

    const expressUrl = await findExpressUrl();

    if (!expressUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "VS Code extension server not found. Make sure the extension is running.",
        },
        { status: 503 }
      );
    }

    // Redirect to Express server
    const expressResponse = await fetch(`${expressUrl}/api/copilot/open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!expressResponse.ok) {
      const errorData = await expressResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Failed to open in Copilot",
        },
        { status: expressResponse.status }
      );
    }

    const data = await expressResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error opening in Copilot:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
