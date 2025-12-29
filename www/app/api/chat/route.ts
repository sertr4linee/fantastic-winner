import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  modelId: string;
  stream?: boolean;
};

// Détecter le port du serveur Express depuis l'environnement ou utiliser le port par défaut
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
        console.log(`[Chat API] Found Express server on port ${port}`);
        cachedExpressUrl = url;
        return url;
      }
    } catch {
      // Continue to next port
    }
  }
  return null;
}

// Vérifier si on est dans le contexte de l'extension VS Code
async function isVSCodeExtensionMode(): Promise<boolean> {
  const url = await findExpressUrl();
  return url !== null;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, modelId, stream = true } = body;

    console.log('[Chat API] Received request:', {
      messagesCount: messages?.length || 0,
      modelId,
      stream,
      firstMessage: messages?.[0]?.content?.substring(0, 50)
    });

    if (!messages || messages.length === 0) {
      console.error('[Chat API] No messages provided');
      return NextResponse.json(
        { success: false, error: "No messages provided" },
        { status: 400 }
      );
    }

    if (!modelId) {
      console.error('[Chat API] No model ID provided');
      return NextResponse.json(
        { success: false, error: "No model ID provided" },
        { status: 400 }
      );
    }

    // Vérifier si le serveur Express est disponible
    const expressUrl = await findExpressUrl();

    if (expressUrl) {
      // Mode Extension VS Code: Rediriger vers le serveur Express
      console.log(`[Chat API] Redirecting to Express server at ${expressUrl}`);
      
      try {
        const expressResponse = await fetch(`${expressUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages, modelId, stream }),
        });

        if (!expressResponse.ok) {
          throw new Error(`Express server returned ${expressResponse.status}`);
        }

        if (stream) {
          // Retourner le stream directement
          return new Response(expressResponse.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        } else {
          // Retourner la réponse JSON
          const data = await expressResponse.json();
          return NextResponse.json(data);
        }
      } catch (error) {
        console.error("[Chat API] Error communicating with Express server:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to communicate with VS Code extension server",
          },
          { status: 503 }
        );
      }
    } else {
      // Mode Développement Standalone: Réponse simulée
      console.log("[Chat API] Running in standalone mode (dev)");
      const lastMessage = messages[messages.length - 1];
      
      if (stream) {
        // Create a streaming response
        const encoder = new TextEncoder();
        const customReadable = new ReadableStream({
          async start(controller) {
            // Simulate streaming response
            const response = `🚧 MODE DÉVELOPPEMENT 🚧\n\nVotre message: "${lastMessage.content}"\n\nCeci est une réponse simulée. Pour utiliser les vrais modèles Copilot:\n1. Démarrez l'extension VS Code\n2. Ouvrez le navigateur via l'extension\n3. Le serveur Express (port ${EXPRESS_PORT}) gérera les vraies requêtes Copilot.`;
            
            // Stream word by word
            const words = response.split(" ");
            for (let i = 0; i < words.length; i++) {
              const chunk = words[i] + (i < words.length - 1 ? " " : "");
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
              );
              await new Promise((resolve) => setTimeout(resolve, 30));
            }
            
            // Send done signal
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`)
            );
            controller.close();
          },
        });

        return new Response(customReadable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } else {
        // Non-streaming response
        const response = `🚧 MODE DÉVELOPPEMENT 🚧\n\nVotre message: "${lastMessage.content}"\n\nRéponse simulée. Utilisez l'extension VS Code pour les vraies requêtes Copilot.`;
        
        return NextResponse.json({
          success: true,
          message: {
            role: "assistant",
            content: response,
          },
          modelId,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
