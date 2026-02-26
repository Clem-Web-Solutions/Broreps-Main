# Guide : Ajouter un champ obligatoire dans Shopify

## Méthode 1 : Champ personnalisé au checkout (Shopify Plus ou Themes récents)

### Étape 1 : Aller dans les paramètres de paiement

1. **Shopify Admin** → **Paramètres** → **Paiement**
2. Descendre jusqu'à **"Informations de contact client"**
3. Cliquer sur **"Gérer les champs de formulaire"**

### Étape 2 : Ajouter un champ personnalisé

1. Cliquer sur **"Ajouter un champ personnalisé"**
2. **Type** : Ligne de texte
3. **Libellé** : "Lien Instagram, TikTok ou URL du profil"
4. **Nom interne** : `social_link`
5. Cocher ✅ **"Champ obligatoire"**
6. Sauvegarder

✅ **Ce champ apparaîtra dans `note_attributes` et sera capturé automatiquement**

---

## Méthode 2 : Champ dans les notes de commande (Plus simple mais pas obligatoire)

### Configuration

1. **Shopify Admin** → **Boutique en ligne** → **Thèmes**
2. Cliquer sur **Personnaliser** sur votre thème actif
3. Aller dans **Panier** ou **Paiement**
4. Activer **"Notes de commande"**
5. Modifier le texte du label : **"Votre lien Instagram/TikTok (obligatoire)"**

⚠️ **Inconvénient** : Le client peut oublier de remplir ce champ (pas vraiment obligatoire)

✅ **Ce champ apparaîtra dans `order.note`**

---

## Méthode 3 : Propriété de produit personnalisée (Pour un produit spécifique)

### Étape 1 : Modifier votre thème

1. **Shopify Admin** → **Boutique en ligne** → **Thèmes**
2. Cliquer sur **Actions** → **Modifier le code**
3. Ouvrir **Sections** → `main-product.liquid` ou `product-template.liquid`

### Étape 2 : Ajouter le champ avant le bouton "Ajouter au panier"

Cherchez la balise `<form` du produit et ajoutez AVANT le bouton d'ajout au panier :

```liquid
<div class="product-form__input">
  <label for="social-link" style="display: block; margin-bottom: 8px; font-weight: bold;">
    Lien Instagram/TikTok (obligatoire) *
  </label>
  <input 
    type="url" 
    id="social-link" 
    name="properties[Lien Instagram]" 
    placeholder="https://instagram.com/votre_compte"
    required
    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"
  >
  <small style="display: block; margin-top: 4px; color: #666;">
    Entrez le lien de votre compte Instagram ou TikTok
  </small>
</div>
```

### Étape 3 : Sauvegarder

Cliquez sur **Enregistrer** et testez en ajoutant le produit au panier.

✅ **Ce champ apparaîtra dans `line_item.properties`**

---

## Méthode 4 : Application Shopify (Plus avancé)

Installez une application Shopify qui permet d'ajouter des champs personnalisés :

- **Bold Product Options** (Payant)
- **Infinite Options** (Payant)
- **Custom Product Builder** (Gratuit avec limitations)

Ces apps créent des champs qui apparaissent dans `line_item.properties`.

---

## Test de configuration

### Étape 1 : Placer une commande test

1. Allez sur votre boutique Shopify
2. Ajoutez un produit au panier
3. Remplissez le champ du lien social : **@test_instagram**
4. Complétez la commande (utilisez le mode test)

### Étape 2 : Vérifier les logs du serveur

Vous devriez voir :

```
[DEBUG] Order data received: {
  note: null,
  note_attributes: [{ name: 'social_link', value: '@test_instagram' }],
  line_item_properties: [],
  line_item_title: 'Vues Youtube'
}
[FOUND] Social link in note_attributes: @test_instagram
[OK] Shopify order saved: {
  id: 124,
  order_number: 1235,
  email: 'test@example.com',
  social_link: '@test_instagram',
  financial_status: 'pending',
  paid: 'NON'
}
```

### Étape 3 : Vérifier dans la base de données

```sql
SELECT 
  shopify_order_number,
  customer_email,
  social_link,
  financial_status,
  created_at
FROM shopify_orders
ORDER BY created_at DESC
LIMIT 5;
```

Vous devriez voir `social_link` rempli avec la valeur saisie.

---

## Quelle méthode choisir ?

| Méthode | Difficulté | Obligatoire | Recommandé |
|---------|-----------|-------------|-----------|
| **1. Champ au checkout** | ⭐ Facile | ✅ Oui | ✅ **MEILLEUR CHOIX** |
| **2. Notes de commande** | ⭐ Très facile | ❌ Non | ⚠️ Si pas d'autre option |
| **3. Propriété de produit** | ⭐⭐ Moyen | ✅ Oui | ✅ Si vous vendez 1 seul produit |
| **4. Application** | ⭐⭐⭐ Avancé | ✅ Oui | ⚠️ Si besoin de +++ fonctionnalités |

---

## En résumé

🎯 **Objectif** : Capturer le lien Instagram/TikTok du client lors de la commande

✅ **Solution recommandée** : Champ personnalisé au checkout (Méthode 1)

🔄 **Le système est déjà configuré** pour chercher le lien dans :
1. `order.note` (notes de commande)
2. `order.note_attributes` (champs personnalisés checkout)
3. `line_item.properties` (propriétés du produit)

💡 **Astuce** : Utilisez le nom de champ contenant les mots-clés `link`, `url`, `instagram`, `tiktok`, `compte` ou `profil` pour que le système le détecte automatiquement.

---

**Besoin d'aide pour l'implémentation ?** Dites-moi quelle méthode vous préférez !
