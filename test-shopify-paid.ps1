# Test webhook Shopify avec paiement validé et lien social
# Usage: .\test-shopify-paid.ps1

$API_URL = "http://localhost:3005"
$WEBHOOK_SECRET = "0649506574626b04847ab17baf67f67aa460412ce3c54fac7fdae5a4ba4b9b93"

Write-Host "[TEST] Simulation d'une commande Shopify avec paiement valide" -ForegroundColor Cyan
Write-Host ""

# Payload d'une commande avec paiement validé et lien social
$orderPayload = @{
    id = [long]820982911946154502
    order_number = 1235
    email = "client@test.com"
    created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    financial_status = "paid"  # PAYÉ
    fulfillment_status = "unfulfilled"
    total_price = "89.99"
    currency = "EUR"
    customer = @{
        id = 123456789
        email = "client@test.com"
        first_name = "John"
        last_name = "Doe"
    }
    line_items = @(
        @{
            id = [long]987654321
            title = "1000 Followers Instagram"
            variant_title = "Livraison Standard"
            quantity = 1
            price = "89.99"
            properties = @(
                @{
                    name = "Lien Instagram"
                    value = "@test_instagram_account"
                }
            )
        }
    )
    note = "Merci pour votre commande !"
    note_attributes = @(
        @{
            name = "social_link"
            value = "https://instagram.com/test_account"
        }
    )
}

$jsonPayload = $orderPayload | ConvertTo-Json -Depth 10

# Calculer la signature HMAC
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($WEBHOOK_SECRET)
$hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($jsonPayload))
$signature = [Convert]::ToBase64String($hash)

Write-Host "[INFO] Payload:" -ForegroundColor Yellow
Write-Host $jsonPayload
Write-Host ""

# Envoyer le webhook
try {
    $response = Invoke-RestMethod -Uri "$API_URL/api/shopify/webhook/orders/create" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Shopify-Hmac-Sha256" = $signature
            "X-Shopify-Shop-Domain" = "broreps.myshopify.com"
            "X-Shopify-Topic" = "orders/create"
        } `
        -Body $jsonPayload
    
    Write-Host "[OK] Webhook envoyé avec succès" -ForegroundColor Green
    Write-Host "Réponse: $($response | ConvertTo-Json)"
    Write-Host ""
    
    Write-Host "[NEXT] Vérifiez dans la base de données:" -ForegroundColor Cyan
    Write-Host "  SELECT * FROM shopify_orders WHERE shopify_order_number = 1235;" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[TEST] Testez la vérification sur http://localhost:5174" -ForegroundColor Cyan
    Write-Host "  Numéro de commande: 1235" -ForegroundColor Gray
    Write-Host "  Email: client@test.com" -ForegroundColor Gray
    
} catch {
    Write-Host "[ERREUR] Échec de l'envoi du webhook" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
