# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI App Builder is a VS Code extension that exposes a Next.js control panel for interacting with GitHub Copilot models. It features real-time DOM editing capabilities through the REALM Protocol (Real-time Element Adaptation Layer for Models).

## Architecture

```
┌─────────────────────────────────┐
│   Next.js Panel (www/)          │
│   Port 3001 - React 19/TS       │
└────────────┬────────────────────┘
             │ WebSocket (port 57129)
┌────────────▼────────────────────┐
│  VS Code Extension (extension/) │
│  - Express + WebSocket server   │
│  - vscode.lm API bridge         │
│  - REALM Protocol engine        │
│  - Activity/Process tracking    │
└─────────────────────────────────┘
```

**Key Communication:** Extension and Panel communicate exclusively via WebSocket on port 57129.

## Build Commands

### Extension (extension/)
```bash
npm install
npm run compile     # Build TypeScript → dist/
npm run watch       # Development with auto-rebuild
npm run package     # Create .vsix for distribution
```

### Web Panel (www/)
```bash
npm install
npm run dev         # Next.js dev server on port 3001
npm run build       # Production build
npm run lint        # ESLint check
```

### Development Workflow
Press F5 in VS Code to launch the Extension Host (compiles automatically), then run `npm run dev` in www/ for the panel.

## Key Singleton Services

| Service | File | Purpose |
|---------|------|---------|
| ModelBridge | `extension/src/modelBridge.ts` | vscode.lm API bridge |
| ActivityTracker | `extension/src/activityTracker.ts` | Real-time activity tracking |
| CopilotHistoryService | `extension/src/copilotHistory.ts` | Conversation history |
| ElementRegistry | `extension/src/realm/ElementRegistry.ts` | REALM element tracking |
| SyncEngine | `extension/src/realm/sync/SyncEngine.ts` | Real-time synchronization |

## REALM Protocol

The REALM Protocol handles real-time element tracking and atomic file modifications:

- **RealmID**: Stable element identification via file path + component + AST position (SHA256 hash)
- **Transactions**: Atomic modifications with Begin → Operations → Validate → Commit/Rollback
- **Adapters**: Framework-specific handlers (ReactTailwindAdapter for React+Tailwind)
- **EventBus**: FIFO event queue with immutability and idempotence guarantees

## WebSocket Message Types

Core message types on `ws://127.0.0.1:57129`:
- Model management: `listModels`, `changeModel`, `modelsUpdated`
- Chat: `sendToBuilder`, `builderResponseChunk`, `builderResponseComplete`
- Activity: `activity`, `startTracking`, `stopTracking`
- Element editing: `applyElementChanges`, `elementChangesApplied`, `fileModified`
- REALM: `realm_event`
- Projects: `detectNextJsProjects`, `startNextJsProject`, `stopNextJsProject`

## Code Conventions

### File Naming
- PascalCase: Classes, components, types (`ModelBridge.ts`, `ElementEditor.tsx`)
- camelCase: Hooks (`useVSCodeBridge.ts`)
- kebab-case: Utilities (`css-to-tailwind.ts`)

### Import Order
1. Node.js built-ins
2. External packages
3. Internal modules (absolute paths)
4. Types

### TypeScript Targets
- Extension: ES2022, CommonJS (Node.js)
- Web Panel: ES2017, ESNext modules (browser)

## Architecture Rules

From `.github/ARCHITECTURE_RULES.md`:
- **Single Source of Truth**: ElementRegistry owns all element state
- **Unidirectional Data Flow**: Events flow one direction only
- **Fail-Safe Default**: Never corrupt source files on errors
- **Single Responsibility**: One file = one concept, max 500 lines
- **Layer Hierarchy**: UI → Sync → Business → Core (no skipping layers)

### Transaction Rules
- Always use Begin/Commit/Rollback pattern
- Validate before commit
- 5-minute transaction timeout

### Security Rules
- Validate all external inputs
- Sanitize selectors (no `javascript:` protocol)
- Validate file paths (prevent path traversal)

## Path Aliases

Web panel uses `@/*` alias pointing to `./src/*`:
```typescript
import { Button } from "@/components/ui/button";
import { useVSCodeBridge } from "@/hooks/useVSCodeBridge";
```

## Shadcn/UI Components

The web panel uses shadcn/ui with Radix primitives. Components are in `www/src/components/ui/`. Add new components via:
```bash
cd www && npx shadcn@latest add <component-name>
```
