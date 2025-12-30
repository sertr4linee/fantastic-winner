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
    const { message, modelId } = body;
    
    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "No message provided",
        },
        { status: 400 }
      );
    }

    const expressUrl = await findExpressUrl();

    if (!expressUrl) {
      return NextResponse.json(
        {
          success: false,
          status: "error",
          error: "VS Code extension server not found. Make sure the extension is running.",
        },
        { status: 503 }
      );
    }

    // Envoyer au serveur Express avec le nouveau endpoint
    const expressResponse = await fetch(`${expressUrl}/api/copilot/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, modelId }),
    });

    if (!expressResponse.ok) {
      const errorData = await expressResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          status: "error",
          error: errorData.error || "Failed to send prompt to Copilot",
        },
        { status: expressResponse.status }
      );
    }

    const data = await expressResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error sending prompt to Copilot:", error);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Obtenir le statut du traitement
export async function GET() {
  try {
    const expressUrl = await findExpressUrl();

    if (!expressUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "VS Code extension server not found",
        },
        { status: 503 }
      );
    }

    const response = await fetch(`${expressUrl}/api/copilot/processing-status`);
    
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to get processing status",
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
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
