#!/bin/bash
# Script d'installation rapide

echo "🚀 AI App Builder - Installation"
echo "================================"

# Extension
echo ""
echo "📦 Installing VS Code Extension dependencies..."
cd extension
npm install

# Compiler l'extension
echo ""
echo "🔨 Compiling extension..."
npm run compile

# Web Panel
echo ""
echo "📦 Installing Web Panel dependencies..."
cd ../web-panel
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Open 'extension/' folder in VS Code"
echo "2. Press F5 to launch in debug mode"
echo "3. The panel will open automatically at http://127.0.0.1:57129"
echo ""
echo "Or run the web panel standalone:"
echo "   cd web-panel && npm run dev"
