#!/bin/bash

# Script de test pour l'intégration Shopify
# Usage: ./test-shopify.sh

echo "🧪 Test de l'intégration Shopify"
echo "================================="
echo ""

# Configuration
API_URL="http://localhost:3005"
TEST_ORDER_NUMBER="1234"
TEST_EMAIL="test@example.com"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📌 Configuration:"
echo "  API URL: $API_URL"
echo "  Test Order: $TEST_ORDER_NUMBER"
echo "  Test Email: $TEST_EMAIL"
echo ""

# Test 1: Health check
echo "1️⃣  Test: Health Check"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not responding${NC}"
    exit 1
fi
echo ""

# Test 2: Track endpoint without verification
echo "2️⃣  Test: Track without verification (old endpoint)"
TRACK_RESPONSE=$(curl -s "$API_URL/api/track/$TEST_ORDER_NUMBER")
echo "$TRACK_RESPONSE" | jq '.' 2>/dev/null || echo "$TRACK_RESPONSE"
echo ""

# Test 3: Verify with correct email
echo "3️⃣  Test: Verify with email (correct)"
VERIFY_CORRECT=$(curl -s -X POST "$API_URL/api/track/verify" \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\": \"$TEST_ORDER_NUMBER\", \"email\": \"$TEST_EMAIL\"}")

if echo "$VERIFY_CORRECT" | grep -q "error"; then
    echo -e "${YELLOW}⚠️  No order found (normal si pas de commande test)${NC}"
else
    echo -e "${GREEN}✅ Verification successful${NC}"
fi
echo "$VERIFY_CORRECT" | jq '.' 2>/dev/null || echo "$VERIFY_CORRECT"
echo ""

# Test 4: Verify with wrong email
echo "4️⃣  Test: Verify with wrong email"
VERIFY_WRONG=$(curl -s -X POST "$API_URL/api/track/verify" \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\": \"$TEST_ORDER_NUMBER\", \"email\": \"wrong@example.com\"}")

if echo "$VERIFY_WRONG" | grep -q "error"; then
    echo -e "${GREEN}✅ Correctly rejected wrong email${NC}"
else
    echo -e "${RED}❌ Should have rejected wrong email${NC}"
fi
echo "$VERIFY_WRONG" | jq '.' 2>/dev/null || echo "$VERIFY_WRONG"
echo ""

# Test 5: Rate limiting test
echo "5️⃣  Test: Rate limiting (6 consecutive attempts)"
for i in {1..6}; do
    RESPONSE=$(curl -s -X POST "$API_URL/api/track/verify" \
      -H "Content-Type: application/json" \
      -d "{\"orderNumber\": \"$TEST_ORDER_NUMBER\", \"email\": \"test$i@example.com\"}")
    
    if [ $i -eq 6 ]; then
        if echo "$RESPONSE" | grep -q "Trop de tentatives"; then
            echo -e "${GREEN}✅ Rate limiting working (attempt $i blocked)${NC}"
        else
            echo -e "${YELLOW}⚠️  Rate limiting may not be working${NC}"
        fi
    fi
done
echo ""

# Test 6: Database check
echo "6️⃣  Test: Database tables"
echo -e "${YELLOW}Vérifiez manuellement avec:${NC}"
echo "  mysql -u root -p broreps_panel -e 'SHOW TABLES LIKE \"shopify%\";'"
echo "  mysql -u root -p broreps_panel -e 'SHOW TABLES LIKE \"verification%\";'"
echo ""

# Test 7: Webhook endpoint (will fail signature check, but should return 401)
echo "7️⃣  Test: Webhook endpoint (signature check)"
WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL/api/shopify/webhook/orders/create" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: fake_signature" \
  -d '{"id": 123, "order_number": 1234, "email": "test@example.com"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✅ Webhook signature verification working (401 Unauthorized)${NC}"
else
    echo -e "${RED}❌ Webhook endpoint should return 401 for invalid signature${NC}"
fi
echo ""

echo "================================="
echo "✅ Tests terminés!"
echo ""
echo "📝 Prochaines étapes:"
echo "  1. Vérifier les tables SQL"
echo "  2. Configurer les webhooks dans Shopify"
echo "  3. Tester avec une vraie commande"
echo ""
