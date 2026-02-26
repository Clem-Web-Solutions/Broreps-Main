# Configuration Shopify - Capture du lien social

## Problème actuel

Le système recherche le lien social (Instagram/TikTok) dans plusieurs endroits :
1. **Note de commande** (`order.note`)
2. **Attributs de note** (`order.note_attributes`)
3. **Propriétés du produit** (`line_item.properties`)

## Solutions pour capturer le lien social

### Option 1 : Champ personnalisé dans le formulaire de commande (RECOMMANDÉ)

1. **Aller dans votre boutique Shopify** → Paramètres → Paiement

2. **Ajouter un champ personnalisé** :
   - Cliquez sur "Personnaliser le formulaire"
   - Ajoutez un champ texte avec comme nom : **"Lien Instagram/TikTok"**
   - Cochez "Obligatoire"

3. **Le système détectera automatiquement** ce champ s'il contient l'un de ces mots-clés :
   - `link`, `url`, `instagram`, `tiktok`, `compte`, `profil`

### Option 2 : Note de commande

Demandez à vos clients d'ajouter leur lien dans les "Instructions spéciales" lors du checkout.

**⚠️ Inconvénient** : Le client peut oublier ou ne pas savoir où le mettre.

### Option 3 : Propriétés de produit personnalisées

1. **Modifier votre produit** dans Shopify Admin

2. **Ajouter un champ personnalisé** dans le thème :
   ```liquid
   <div class="product-form__input product-form__input--dropdown">
     <label for="instagram-link">Lien Instagram/TikTok (obligatoire):</label>
     <input type="text" id="instagram-link" name="properties[Lien Instagram]" required>
   </div>
   ```

3. Le système récupérera automatiquement cette valeur via `line_item.properties`

## Vérification du statut de paiement

Le système vérifie automatiquement le champ `financial_status` de Shopify :
- ✅ **`paid`** = Paiement validé
- ⚠️ **`pending`** = En attente de paiement
- ❌ **`refunded`** = Remboursé
- ❌ **`voided`** = Annulé

### Dans l'interface suivis, vous verrez :

**Commande avec paiement validé :**
```
┌─────────────────────────────────────────┐
│ 🛡️ Informations Shopify               │
│                                         │
│ Lien social: @username                 │
│ Client: John Doe                        │
│                                         │
│ ● Payé            150.00 €            │
└─────────────────────────────────────────┘
```

**Commande en attente de paiement :**
```
┌─────────────────────────────────────────┐
│ 🛡️ Informations Shopify               │
│                                         │
│ Lien social: Non fourni                │
│                                         │
│ ● Paiement en attente    150.00 €     │
└─────────────────────────────────────────┘
```

## Test du système

### Étape 1 : Déclencher un webhook test

```powershell
# Placez une vraie commande sur Shopify avec :
# - Un email valide
# - Un lien Instagram dans un champ personnalisé
# - Paiement complet

# Vérifier les logs du serveur
```

### Étape 2 : Vérifier dans la base de données

```sql
-- Voir les dernières commandes Shopify
SELECT 
  shopify_order_number,
  customer_email,
  social_link,
  financial_status,
  total_price,
  created_at
FROM shopify_orders
ORDER BY created_at DESC
LIMIT 10;

-- Voir les logs de webhook
SELECT 
  topic,
  shopify_order_id,
  signature_valid,
  processed,
  error_message,
  created_at
FROM shopify_webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Étape 3 : Tester la vérification

1. Allez sur : http://localhost:5174 (ou votre tunnel Cloudflare)
2. Entrez le numéro de commande (ex: #1234)
3. Entrez l'email utilisé sur Shopify
4. Vérifiez que vous voyez :
   - Le lien social (Instagram/TikTok)
   - Le statut du paiement (Payé / En attente)
   - Le nom du client
   - Le montant total

## Logs de débogage

Le système affiche maintenant des logs détaillés :

```
[WEBHOOK] Shopify Order Received: { 
  id: 5432109876543,
  order_number: 1234,
  email: 'client@example.com',
  financial_status: 'paid',
  total_price: '150.00'
}
[PAYMENT] Order #1234 - Status: paid
[OK] Paiement valide pour commande #1234
[DEBUG] Order data received: {
  note: '@instagram_username',
  note_attributes: [],
  line_item_properties: [],
  line_item_title: '1000 Followers Instagram'
}
[FOUND] Social link in note: @instagram_username
[OK] Shopify order saved: {
  id: 123,
  order_number: 1234,
  email: 'client@example.com',
  social_link: '@instagram_username',
  financial_status: 'paid',
  paid: 'OUI'
}
```

## Résolution des problèmes

### Le lien social n'apparaît pas

**Solution 1** : Vérifiez les logs du serveur pour voir ce qui a été reçu :
```
[DEBUG] Order data received: { note: '', note_attributes: [], line_item_properties: [] }
[WARN] Aucun lien social trouve pour commande #1234
```

→ Le client n'a pas fourni le lien. Configurez un champ obligatoire (Option 1).

**Solution 2** : Vérifiez la base de données :
```sql
SELECT social_link, shopify_order_number 
FROM shopify_orders 
WHERE shopify_order_number = 1234;
```

→ Si `social_link` est vide ou `NULL`, le webhook n'a pas capturé le lien.

### Le statut de paiement est incorrect

Vérifiez dans Shopify Admin → Commandes → Détails de la commande :
- **Statut financier** doit être "Payé"

Si ce n'est pas le cas :
- Le client n'a pas finalisé le paiement
- Le paiement est en attente de validation (virement, etc.)
- Le paiement a échoué

## Configuration recommandée

Pour une expérience optimale :

1. ✅ **Champ obligatoire** dans le formulaire de commande Shopify (voir [SHOPIFY_ADD_FIELD.md](SHOPIFY_ADD_FIELD.md))
2. ✅ **Tunnel Cloudflare** configuré pour recevoir les webhooks
3. ✅ **2 Webhooks configurés dans Shopify Admin** :
   - `orders/create` → `https://votre-tunnel.com/api/shopify/webhook/orders/create`
   - `orders/updated` → `https://votre-tunnel.com/api/shopify/webhook/orders/updated` ⚠️ **IMPORTANT**
4. ✅ **Tests réguliers** avec de vraies commandes

### Pourquoi 2 webhooks ?

**Webhook 1 : `orders/create`** (Création de commande)
- Se déclenche dès que le client crée la commande
- `financial_status` = `pending` ou `voided` (normal !)
- Permet de créer l'entrée en base de données rapidement

**Webhook 2 : `orders/updated`** (Mise à jour de commande)
- Se déclenche quand le client finalise le paiement
- `financial_status` = `paid` (paiement validé !)
- Met à jour automatiquement le statut en base de données

### Configuration dans Shopify Admin

1. **Shopify Admin** → **Paramètres** → **Notifications**
2. Descendre jusqu'à **"Webhooks"**
3. Cliquer sur **"Créer un webhook"**

**Webhook 1** :
- Événement : **Order creation** (Création de commande)
- Format : **JSON**
- URL : `https://votre-tunnel.trycloudflare.com/api/shopify/webhook/orders/create`

**Webhook 2** :
- Événement : **Order updated** (Mise à jour de commande)
- Format : **JSON**
- URL : `https://votre-tunnel.trycloudflare.com/api/shopify/webhook/orders/updated`

4. Sauvegarder les deux webhooks

## Interface utilisateur mise à jour

L'interface `suivis` affiche maintenant :

1. **Lien social** : Le lien Instagram/TikTok du client (ou "Non fourni")
2. **Statut de paiement** : Badge vert "Payé" ou jaune "Paiement en attente"
3. **Nom du client** : Prénom et nom du client Shopify
4. **Montant total** : Prix total de la commande

Ces informations apparaissent automatiquement dans une carte dédiée sous le header de la commande.

---

✅ **Votre système est maintenant configuré pour capturer et afficher les liens sociaux et le statut de paiement !**
