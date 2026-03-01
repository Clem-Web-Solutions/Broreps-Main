# SQL Files - Reference Only

⚠️ **IMPORTANT**: Ces fichiers sont conservés pour référence historique uniquement.

## 📋 Pour initialiser la base de données

Utilisez le fichier principal à la racine du dossier `server/` :

```bash
mysql -u your_user -p your_database < init-db.sql
```

Le fichier `init-db.sql` contient **TOUTES** les tables nécessaires :
- Tables de base (users, orders, services, etc.)
- Tables Shopify (shopify_orders, shopify_webhook_logs, etc.)
- Tables TagadaPay (tagadapay_orders, tagadapay_webhook_logs, etc.)
- Tables de notifications
- Tous les index et clés étrangères

## 📁 Fichiers dans ce dossier

Ces fichiers sont des **migrations historiques** et ne doivent **PAS** être exécutés individuellement :

| Fichier | Description | Status |
|---------|-------------|--------|
| `add-bulkmedya-provider.sql` | Ajout du provider BulkMedya | ✅ Inclus dans init-db.sql |
| `add-partial-status.sql` | Ajout du statut "partial" | ✅ Inclus dans init-db.sql |
| `add-provider-order-id.sql` | Colonne provider_order_id | ✅ Inclus dans init-db.sql |
| `add-shopify-order-number.sql` | Colonne Shopify order number | ✅ Inclus dans init-db.sql |
| `add-user-status.sql` | Statuts utilisateurs | ✅ Inclus dans init-db.sql |
| `allowed-services.sql` | Table des services autorisés | ✅ Inclus dans init-db.sql |
| `default-provider.sql` | Configuration provider par défaut | ✅ Inclus dans init-db.sql |
| `fix-orders-service-id.sql` | Fix type service_id | ✅ Inclus dans init-db.sql |
| `notifications.sql` | Table notifications | ✅ Inclus dans init-db.sql |
| `orders-dripfeed-update.sql` | Colonnes drip feed | ✅ Inclus dans init-db.sql |
| `shopify-orders.sql` | Tables Shopify | ✅ Inclus dans init-db.sql |
| `tagadapay-tables.sql` | Tables TagadaPay | ✅ Inclus dans init-db.sql |

## ⚙️ Setup complet

### 1. Base de données vierge

Pour une nouvelle installation :

```bash
# Créer la base de données
mysql -u root -p -e "CREATE DATABASE broreps_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importer le schéma complet
mysql -u your_user -p broreps_db < init-db.sql
```

### 2. Vérifier les tables

```sql
USE broreps_db;
SHOW TABLES;
```

Vous devriez voir :
```
+----------------------------+
| Tables_in_broreps_db       |
+----------------------------+
| alerts                     |
| allowed_services           |
| notifications              |
| orders                     |
| providers                  |
| services                   |
| shopify_orders             |
| shopify_webhook_logs       |
| tagadapay_orders           |
| tagadapay_verification_logs|
| tagadapay_webhook_logs     |
| users                      |
| verification_logs          |
+----------------------------+
```

### 3. Scripts automatisés

Utilisez les scripts de setup qui automatisent le processus :

**Windows :**
```powershell
cd server
.\setup-tagadapay.ps1
```

**Linux/Mac :**
```bash
cd server
chmod +x setup-tagadapay.sh
./setup-tagadapay.sh
```

## 🔄 Migrations futures

Pour ajouter de nouvelles tables ou colonnes :

1. ✅ **À FAIRE** : Mettre à jour `init-db.sql` avec `CREATE TABLE IF NOT EXISTS`
2. ✅ **À FAIRE** : Créer un fichier de migration spécifique dans ce dossier (pour référence)
3. ✅ **À FAIRE** : Ajouter le nom du fichier à la liste ci-dessus
4. ❌ **NE PAS** : Exécuter les fichiers de ce dossier sur une base de données existante

## 📖 Documentation

- **Setup complet** : `server/TAGADAPAY_SETUP.md`
- **Guide d'intégration** : `TAGADAPAY_INTEGRATION.md`
- **Schema principal** : `server/init-db.sql`

## 💡 Pourquoi cette structure ?

**Avantages :**
- ✅ Une seule commande pour setup complet
- ✅ Pas de risque d'oublier une migration
- ✅ `CREATE TABLE IF NOT EXISTS` = idempotent
- ✅ Facilite les tests et déploiements
- ✅ Historique conservé pour référence

**Avant (problèmes) :**
- ❌ 12+ fichiers SQL séparés
- ❌ Ordre d'exécution important
- ❌ Risque d'oublis
- ❌ Difficile à maintenir

**Maintenant :**
- ✅ 1 fichier : `init-db.sql`
- ✅ Exécution simple
- ✅ Tout inclus
- ✅ Facile à versionner

---

**Rappel** : N'exécutez jamais les fichiers de ce dossier directement. Utilisez toujours `init-db.sql` à la racine du dossier `server/`.
