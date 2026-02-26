# 🛍️ Intégration Shopify - Configuration

Ce guide explique comment configurer l'intégration Shopify pour synchroniser automatiquement les commandes et activer la vérification par email.

## 📋 Prérequis

- Un compte Shopify avec accès administrateur
- Accès à la configuration du serveur Broreps
- Node.js et MySQL installés

---

## 🔧 Configuration Backend

### 1. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Shopify Configuration
SHOPIFY_SHOP_URL=votre-boutique.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_WEBHOOK_SECRET=votre_secret_webhook_genere_par_shopify
```

**Comment obtenir ces valeurs :**

#### A. SHOPIFY_SHOP_URL
- C'est le domaine de votre boutique (ex: `broreps.myshopify.com`)

#### B. SHOPIFY_ACCESS_TOKEN
1. Allez dans Shopify Admin → Apps → Develop apps
2. Créez une nouvelle app privée
3. Activez les permissions suivantes :
   - `read_orders` - Lire les commandes
   - `write_orders` - Modifier les commandes (optionnel)
4. Installez l'app et copiez le token d'accès

#### C. SHOPIFY_WEBHOOK_SECRET
1. Générez un secret aléatoire sécurisé :
```bash
openssl rand -hex 32
```
2. Copiez ce secret dans votre `.env`

### 2. Base de données

Exécutez le script SQL pour créer les tables nécessaires :

```bash
mysql -u root -p broreps_panel < server/sql/shopify-orders.sql
```

Ou depuis MySQL :
```sql
source server/sql/shopify-orders.sql;
```

Les tables créées :
- `shopify_orders` - Stocke les commandes Shopify
- `shopify_webhook_logs` - Logs des webhooks reçus
- `verification_logs` - Logs des tentatives de vérification

---

## 🔗 Configuration Shopify

### Option 1 : Via l'interface Shopify (Recommandé)

1. **Accédez aux Webhooks**
   - Shopify Admin → Settings → Notifications
   - Scrollez jusqu'à "Webhooks"

2. **Créez un webhook pour "Order creation"**
   - Event: `Order creation`
   - Format: `JSON`
   - URL: `https://votre-domaine.com/api/shopify/webhook/orders/create`
   - Version de l'API: `2024-01` (dernière stable)

3. **Créez un webhook pour "Order updated" (Optionnel)**
   - Event: `Order updated`
   - Format: `JSON`
   - URL: `https://votre-domaine.com/api/shopify/webhook/orders/updated`

### Option 2 : Via l'API Shopify

Utilisez curl pour créer les webhooks automatiquement :

```bash
# Webhook pour création de commande
curl -X POST "https://votre-boutique.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: VOTRE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/create",
      "address": "https://votre-domaine.com/api/shopify/webhook/orders/create",
      "format": "json"
    }
  }'

# Webhook pour mise à jour de commande
curl -X POST "https://votre-boutique.myshopify.com/admin/api/2024-01/webhooks.json" \
  -H "X-Shopify-Access-Token: VOTRE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "topic": "orders/updated",
      "address": "https://votre-domaine.com/api/shopify/webhook/orders/updated",
      "format": "json"
    }
  }'
```

---

## 🔐 Sécurité

### Signature HMAC

Tous les webhooks sont vérifiés avec HMAC SHA256 pour garantir qu'ils proviennent bien de Shopify.

**Le serveur vérifie automatiquement :**
- La signature dans le header `X-Shopify-Hmac-Sha256`
- La validité du secret configuré
- L'intégrité du payload

### Rate Limiting

Le système de vérification par email inclut un rate limiting :
- **5 tentatives maximum** par IP toutes les 15 minutes
- Protection contre les attaques par force brute
- Logs de toutes les tentatives

---

## 📊 Flux de Données

```
┌─────────────────────┐
│  Client passe       │
│  commande Shopify   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Shopify envoie     │
│  Webhook            │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Server reçoit      │
│  /api/shopify/      │
│  webhook/orders/    │
│  create             │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Vérification       │
│  signature HMAC     │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Insertion dans     │
│  shopify_orders     │
│  + log webhook      │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Client visite      │
│  site de suivi      │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  1. Entre numéro    │
│  de commande        │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  2. Entre email     │
│  de vérification    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  Server vérifie     │
│  POST /api/track/   │
│  verify             │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│  ✓ Email match      │
│  → Affiche détails  │
│                     │
│  ✗ Email incorrect  │
│  → Erreur           │
└─────────────────────┘
```

---

## 🧪 Tests

### 1. Tester le webhook manuellement

```bash
curl -X POST "http://localhost:3005/api/shopify/webhook/orders/create" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: FAKE_SIGNATURE" \
  -d '{
    "id": 123456789,
    "order_number": 1234,
    "email": "test@example.com",
    "phone": "+33612345678",
    "customer": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "test@example.com"
    },
    "line_items": [{
      "title": "Instagram Followers",
      "variant_title": "1000 Followers",
      "quantity": 1000,
      "price": "49.99"
    }],
    "total_price": "49.99",
    "note": "https://instagram.com/username",
    "created_at": "2026-02-14T12:00:00Z",
    "financial_status": "paid",
    "fulfillment_status": "pending"
  }'
```

**Note:** Cette requête échouera car la signature HMAC est fausse. C'est normal !

### 2. Vérifier les tables

```sql
-- Vérifier les commandes Shopify
SELECT * FROM shopify_orders ORDER BY created_at DESC LIMIT 5;

-- Vérifier les logs de webhooks
SELECT * FROM shopify_webhook_logs ORDER BY created_at DESC LIMIT 10;

-- Vérifier les tentatives de vérification
SELECT * FROM verification_logs ORDER BY created_at DESC LIMIT 10;
```

### 3. Tester la vérification par email

```bash
# Test avec email correct
curl -X POST "http://localhost:3005/api/track/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "1234",
    "email": "test@example.com"
  }'

# Test avec email incorrect
curl -X POST "http://localhost:3005/api/track/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "1234",
    "email": "wrong@example.com"
  }'
```

---

## 🚀 Démarrage

1. **Installez les dépendances** (si pas déjà fait)
```bash
cd server
npm install
```

2. **Configurez le `.env`** avec vos credentials Shopify

3. **Exécutez les migrations SQL**
```bash
mysql -u root -p broreps_panel < sql/shopify-orders.sql
```

4. **Démarrez le serveur**
```bash
npm run dev
```

5. **Configurez les webhooks** sur Shopify (voir ci-dessus)

6. **Testez** en passant une vraie commande sur Shopify

---

## 📝 Logs

Les logs sont disponibles dans :
- Console du serveur (temps réel)
- Table `shopify_webhook_logs`
- Table `verification_logs`

**Exemples de logs :**
```
📦 Shopify Order Webhook Received: { id: 123456789, order_number: 1234, email: 'test@example.com' }
✅ Shopify webhook signature verified
✅ Shopify order saved: { id: 1, order_number: 1234, email: 'test@example.com' }

🔐 Step 2: Verifying with email: test@example.com
✅ Order verified: { id: 1234, status: 'pending', ... }
```

---

## ⚠️ Troubleshooting

### Webhook ne reçoit rien
- Vérifiez que l'URL est accessible publiquement (pas localhost)
- Utilisez ngrok pour tester en local : `ngrok http 3005`
- Vérifiez les logs Shopify Admin → Settings → Notifications → Webhooks

### Signature HMAC invalide
- Vérifiez que `SHOPIFY_WEBHOOK_SECRET` est correct
- Shopify doit envoyer le header `X-Shopify-Hmac-Sha256`

### Email non reconnu
- Vérifiez que l'email est bien stocké en lowercase
- Comparez avec `SELECT customer_email FROM shopify_orders WHERE shopify_order_number = 1234;`

### Rate limit atteint
- Attendez 15 minutes
- Ou redémarrez le serveur (le cache est en mémoire)

---

## 📞 Support

Pour toute question, consultez :
- Documentation Shopify : https://shopify.dev/docs/api/admin-rest/latest/resources/webhook
- Logs serveur : `tail -f logs/server.log`
- Tables de debug : `shopify_webhook_logs`, `verification_logs`

---

✅ **Votre système Shopify est maintenant configuré !**
