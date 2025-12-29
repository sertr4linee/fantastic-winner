import { NextResponse } from "next/server";

const POSSIBLE_PORTS = [60886, 60885, 60887, 60888];
const EXPRESS_PORT = process.env.EXPRESS_SERVER_PORT || POSSIBLE_PORTS[0];

let cachedExpressUrl: string | null = null;

// Trouver le port actif du serveur Express
async function findExpressUrl(): Promise<string | null> {
  if (cachedExpressUrl) return cachedExpressUrl;
  
  const ports = EXPRESS_PORT ? [EXPRESS_PORT, ...POSSIBLE_PORTS] : POSSIBLE_PORTS;
  
  for (const port of ports) {
    try {
      const url = `http://localhost:${port}`;
      const response = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) {
        console.log(`[Status API] Found Express server on port ${port}`);
        cachedExpressUrl = url;
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

    if (expressUrl) {
      // Mode Extension VS Code: Récupérer le status du serveur Express
      console.log(`[Status API] Fetching status from ${expressUrl}`);
      
      try {
        const expressResponse = await fetch(`${expressUrl}/api/status`);
        
        if (!expressResponse.ok) {
          throw new Error(`Express server returned ${expressResponse.status}`);
        }
        
        const data = await expressResponse.json();
        return NextResponse.json(data);
      } catch (error) {
        console.error("[Status API] Error fetching from Express server:", error);
        return NextResponse.json(
          {
            success: false,
            status: "disconnected",
            error: "Failed to connect to VS Code extension",
          },
          { status: 503 }
        );
      }
    } else {
      // Mode Développement Standalone
      console.log("[Status API] Running in standalone mode (dev)");
      const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

      return NextResponse.json({
        success: true,
        status: "standalone",
        currentPath: workspacePath,
        timestamp: new Date().toISOString(),
        isDevelopmentMode: true,
        message: "Running in development mode. Start VS Code extension for full features.",
      });
    }
  } catch (error) {
    console.error("Error getting status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
