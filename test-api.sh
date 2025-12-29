#!/bin/bash

# Script de test pour l'API du serveur Express
# Usage: ./test-api.sh

PORT=60885
BASE_URL="http://localhost:${PORT}"

echo "========================================"
echo "Test du serveur Express - Port ${PORT}"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Status
echo -e "${YELLOW}Test 2: Status${NC}"
STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/status")
HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
BODY=$(echo "$STATUS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Status check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Status check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 3: Models
echo -e "${YELLOW}Test 3: Models${NC}"
MODELS_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/models")
HTTP_CODE=$(echo "$MODELS_RESPONSE" | tail -n1)
BODY=$(echo "$MODELS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Models fetch passed${NC}"
    echo "Response: $BODY" | jq '.' 2>/dev/null || echo "Response: $BODY"
    
    # Extract first model ID for chat test
    FIRST_MODEL_ID=$(echo "$BODY" | jq -r '.models[0].id' 2>/dev/null)
    echo "First model ID: $FIRST_MODEL_ID"
else
    echo -e "${RED}✗ Models fetch failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 4: Chat (only if we have a model ID)
if [ ! -z "$FIRST_MODEL_ID" ] && [ "$FIRST_MODEL_ID" != "null" ]; then
    echo -e "${YELLOW}Test 4: Chat with model ${FIRST_MODEL_ID}${NC}"
    
    CHAT_PAYLOAD=$(cat <<EOF
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, this is a test message"
    }
  ],
  "modelId": "${FIRST_MODEL_ID}",
  "stream": false
}
EOF
)
    
    echo "Sending payload:"
    echo "$CHAT_PAYLOAD" | jq '.' 2>/dev/null || echo "$CHAT_PAYLOAD"
    echo ""
    
    CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$CHAT_PAYLOAD" \
        "${BASE_URL}/api/chat")
    
    HTTP_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
    BODY=$(echo "$CHAT_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Chat request passed${NC}"
        echo "Response: $BODY" | jq '.' 2>/dev/null || echo "Response: $BODY"
    else
        echo -e "${RED}✗ Chat request failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
else
    echo -e "${YELLOW}Test 4: Skipped (no model ID available)${NC}"
fi
echo ""

# Summary
echo "========================================"
echo "Tests terminés"
echo "========================================"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "- Si tous les tests échouent, vérifiez que l'extension VS Code est lancée (F5)"
echo "- Si le health check passe mais pas les autres, vérifiez les permissions Copilot"
echo "- Si le chat échoue, vérifiez que vous êtes connecté à GitHub Copilot dans VS Code"
