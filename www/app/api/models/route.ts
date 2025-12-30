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
        console.log(`[Models API] Found Express server on port ${port}`);
        cachedExpressUrl = url;
        return url;
      }
    } catch {
      // Continue to next port
    }
  }
  return null;
}

// Mock Copilot models for standalone Next.js app
const MOCK_MODELS = [
  {
    id: "gpt-4",
    name: "GPT-4 (Mock)",
    family: "gpt-4",
    version: "0613",
    vendor: "OpenAI",
    maxInputTokens: 8192,
    isAgent: true,
    capabilities: {
      chat: true,
      code: true,
      streaming: true,
    },
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo (Mock)",
    family: "gpt-4",
    version: "turbo",
    vendor: "OpenAI",
    maxInputTokens: 128000,
    isAgent: true,
    capabilities: {
      chat: true,
      code: true,
      streaming: true,
    },
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo (Mock)",
    family: "gpt-3.5-turbo",
    version: "0125",
    vendor: "OpenAI",
    maxInputTokens: 16385,
    isAgent: true,
    capabilities: {
      chat: true,
      code: true,
      streaming: true,
    },
  },
  {
    id: "claude-3-opus",
    name: "Claude 3 Opus (Mock)",
    family: "claude-3",
    version: "opus",
    vendor: "Anthropic",
    maxInputTokens: 200000,
    isAgent: true,
    capabilities: {
      chat: true,
      code: true,
      streaming: true,
    },
  },
  {
    id: "claude-3-sonnet",
    name: "Claude 3 Sonnet (Mock)",
    family: "claude-3",
    version: "sonnet",
    vendor: "Anthropic",
    maxInputTokens: 200000,
    isAgent: true,
    capabilities: {
      chat: true,
      code: true,
      streaming: true,
    },
  },
  {
    id: "claude-3-haiku",
    name: "Claude 3 Haiku (Mock)",
    family: "claude-3",
    version: "haiku",
    vendor: "Anthropic",
    maxInputTokens: 200000,
    isAgent: true,
    capabilities: {
      chat: true,
      code: true,
      streaming: true,
    },
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro (Mock)",
    family: "gemini",
    version: "pro",
    vendor: "Google",
    maxInputTokens: 32768,
    isAgent: false,
    capabilities: {
      chat: true,
      code: false,
      streaming: true,
    },
  },
  {
    id: "mistral-large",
    name: "Mistral Large (Mock)",
    family: "mistral",
    version: "large",
    vendor: "Mistral",
    maxInputTokens: 32000,
    isAgent: false,
    capabilities: {
      chat: true,
      code: false,
      streaming: true,
    },
  },
];

export async function GET() {
  try {
    const expressUrl = await findExpressUrl();

    if (expressUrl) {
      // Mode Extension VS Code: Récupérer les vrais modèles depuis le serveur Express
      console.log(`[Models API] Fetching real Copilot models from ${expressUrl}`);
      
      try {
        const expressResponse = await fetch(`${expressUrl}/api/models`);
        
        if (!expressResponse.ok) {
          throw new Error(`Express server returned ${expressResponse.status}`);
        }
        
        const data = await expressResponse.json();
        return NextResponse.json(data);
      } catch (error) {
        console.error("[Models API] Error fetching from Express server:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch models from VS Code extension",
          },
          { status: 503 }
        );
      }
    } else {
      // Mode Développement Standalone: Retourner des modèles simulés
      console.log("[Models API] Running in standalone mode (dev) - returning mock models");
      return NextResponse.json({
        success: true,
        models: MOCK_MODELS,
        timestamp: new Date().toISOString(),
        isDevelopmentMode: true,
      });
    }
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
