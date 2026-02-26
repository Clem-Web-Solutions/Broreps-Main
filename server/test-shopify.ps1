# Script de test pour l'intégration Shopify (PowerShell)
# Usage: .\test-shopify.ps1

Write-Host "🧪 Test de l'intégration Shopify" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "http://localhost:3005"
$TEST_ORDER_NUMBER = "1234"
$TEST_EMAIL = "test@example.com"

Write-Host "📌 Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $API_URL"
Write-Host "  Test Order: $TEST_ORDER_NUMBER"
Write-Host "  Test Email: $TEST_EMAIL"
Write-Host ""

# Test 1: Health check
Write-Host "1️⃣  Test: Health Check" -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$API_URL/health" -Method GET
    if ($healthResponse.status -eq "ok") {
        Write-Host "✅ Server is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Server responded but status is not ok" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Server is not responding" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Test 2: Track endpoint without verification
Write-Host "2️⃣  Test: Track without verification (old endpoint)" -ForegroundColor Cyan
try {
    $trackResponse = Invoke-RestMethod -Uri "$API_URL/api/track/$TEST_ORDER_NUMBER" -Method GET
    $trackResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "⚠️  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Verify with correct email
Write-Host "3️⃣  Test: Verify with email (correct)" -ForegroundColor Cyan
try {
    $body = @{
        orderNumber = $TEST_ORDER_NUMBER
        email = $TEST_EMAIL
    } | ConvertTo-Json

    $verifyCorrect = Invoke-RestMethod -Uri "$API_URL/api/track/verify" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Verification successful" -ForegroundColor Green
    $verifyCorrect | ConvertTo-Json -Depth 5
} catch {
    Write-Host "⚠️  No order found (normal si pas de commande test)" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}
Write-Host ""

# Test 4: Verify with wrong email
Write-Host "4️⃣  Test: Verify with wrong email" -ForegroundColor Cyan
try {
    $body = @{
        orderNumber = $TEST_ORDER_NUMBER
        email = "wrong@example.com"
    } | ConvertTo-Json

    $verifyWrong = Invoke-RestMethod -Uri "$API_URL/api/track/verify" -Method POST -Body $body -ContentType "application/json"
    Write-Host "❌ Should have rejected wrong email" -ForegroundColor Red
} catch {
    Write-Host "✅ Correctly rejected wrong email" -ForegroundColor Green
}
Write-Host ""

# Test 5: Rate limiting test
Write-Host "5️⃣  Test: Rate limiting (6 consecutive attempts)" -ForegroundColor Cyan
for ($i = 1; $i -le 6; $i++) {
    try {
        $body = @{
            orderNumber = $TEST_ORDER_NUMBER
            email = "test$i@example.com"
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$API_URL/api/track/verify" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    } catch {
        if ($i -eq 6 -and $_.Exception.Message -match "Too many|Trop de") {
            Write-Host "✅ Rate limiting working (attempt $i blocked)" -ForegroundColor Green
        }
    }
}
Write-Host ""

# Test 6: Database check
Write-Host "6️⃣  Test: Database tables" -ForegroundColor Cyan
Write-Host "Vérifiez manuellement avec:" -ForegroundColor Yellow
Write-Host '  mysql -u root -p broreps_panel -e "SHOW TABLES LIKE ''shopify%'';"'
Write-Host '  mysql -u root -p broreps_panel -e "SHOW TABLES LIKE ''verification%'';"'
Write-Host ""

# Test 7: Webhook endpoint (will fail signature check)
Write-Host "7️⃣  Test: Webhook endpoint (signature check)" -ForegroundColor Cyan
try {
    $webhookBody = @{
        id = 123
        order_number = 1234
        email = "test@example.com"
    } | ConvertTo-Json

    $headers = @{
        "X-Shopify-Hmac-Sha256" = "fake_signature"
    }

    Invoke-RestMethod -Uri "$API_URL/api/shopify/webhook/orders/create" -Method POST -Body $webhookBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
    Write-Host "❌ Webhook endpoint should return 401 for invalid signature" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Webhook signature verification working (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected response: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Tests terminés!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "  1. Vérifier les tables SQL"
Write-Host "  2. Configurer les webhooks dans Shopify"
Write-Host "  3. Tester avec une vraie commande"
Write-Host ""
