# Système de Notifications en Temps Réel 🔔

## Vue d'ensemble

Système complet de notifications push pour BroReps Supply avec notifications en temps réel pour les événements importants.

## Fonctionnalités

### Types de Notifications

1. **📦 order_created** - Nouvelle commande créée
   - Notifie tous les admins
   - Affiche le nom du service et la quantité
   - Lien direct vers `/commandes`

2. **💧 drip_executed** - Run Drip Feed exécuté
   - Notifie tous les admins
   - Affiche le numéro du run (ex: 2/5)
   - Quantité livrée
   - Lien direct vers `/commandes`

3. **✅ order_completed** - Commande terminée
   - Pour les Drip Feed: tous les runs terminés
   - Notifie tous les admins
   - Lien direct vers `/commandes`

4. **⚠️ low_balance** - Solde faible
   - Alerte à 50 USD (configurable)
   - Alerte critique à 20 USD
   - Ne notifie qu'une fois par heure
   - Lien direct vers `/config`

### Configuration Backend

#### Variables d'environnement

```env
LOW_BALANCE_THRESHOLD=50          # Seuil d'alerte solde faible (USD)
CRITICAL_BALANCE_THRESHOLD=20     # Seuil d'alerte critique (USD)
```

#### Base de données

Table `notifications` créée automatiquement via `init-db.sql`:

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,                    -- NULL = tous les admins
  type ENUM(...),
  title VARCHAR(255),
  message TEXT,
  data JSON NULL,                      -- Données additionnelles
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(512) NULL,              -- Lien de redirection
  created_at TIMESTAMP
);
```

#### Routes API

```
GET    /api/notifications              # Liste des notifications (+ unread count)
PATCH  /api/notifications/:id/read    # Marquer comme lu
POST   /api/notifications/read-all    # Tout marquer comme lu
DELETE /api/notifications/:id          # Supprimer
DELETE /api/notifications/clear/read  # Supprimer toutes les lues
```

#### Helpers Backend

```javascript
// Dans n'importe quel fichier routes/
import { notifyAdmins, createNotification } from './notifications.js';

// Notifier tous les admins
await notifyAdmins({
    type: 'order_created',
    title: 'Nouvelle commande',
    message: 'Instagram Followers - 1000 unités',
    data: { orderId: 123 },
    link: '/commandes'
});

// Notifier un utilisateur spécifique
await createNotification({
    userId: 5,
    type: 'system',
    title: 'Compte approuvé',
    message: 'Votre compte a été approuvé',
    link: '/dashboard'
});
```

### Configuration Frontend

#### Composant NotificationBell

Intégré dans `DashboardLayout.tsx`:

```tsx
import { NotificationBell } from '../notifications/NotificationBell';

<NotificationBell />
```

**Fonctionnalités:**
- Badge avec compteur (ex: 3 notifications non lues)
- Dropdown avec liste scrollable
- Auto-refresh toutes les 30 secondes
- Marquer comme lu au clic
- Supprimer individuellement
- Marquer tout comme lu
- Click-to-navigate vers les liens

#### API Client

```typescript
import api from '../libs/api';

// Charger les notifications
const data = await api.getNotifications(false, 20);
// { notifications: [...], unread_count: 3 }

// Marquer comme lu
await api.markNotificationAsRead(notificationId);

// Tout marquer comme lu
await api.markAllNotificationsAsRead();

// Supprimer
await api.deleteNotification(notificationId);

// Nettoyer les lues
await api.clearReadNotifications();
```

## Intégration Points

### 1. Création de Commande (drip-feed.js)

```javascript
// Standard order
await notifyAdmins({
    type: 'order_created',
    title: '📦 Nouvelle commande',
    message: `${service_name} - ${totalQuantity} unités`,
    data: { orderId, shopify_order_number },
    link: '/commandes'
});

// Drip feed order
await notifyAdmins({
    type: 'order_created',
    title: '💧 Nouvelle commande Drip Feed',
    message: `${service_name} - ${totalQuantity} unités en ${runs} exécutions`,
    data: { orderId, runs },
    link: '/commandes'
});
```

### 2. Execution Drip Feed (drip-feed.js - CRON)

```javascript
// Run exécuté
await notifyAdmins({
    type: 'drip_executed',
    title: `💧 Run ${currentRun}/${totalRuns} exécuté`,
    message: `Commande #${orderId} - ${quantity} unités livrées`,
    data: { orderId, currentRun, totalRuns },
    link: '/commandes'
});

// Commande terminée
await notifyAdmins({
    type: 'order_completed',
    title: '✅ Commande Drip Feed terminée',
    message: `Commande #${orderId} - ${runs} exécutions terminées`,
    data: { orderId, runs },
    link: '/commandes'
});
```

### 3. Vérification Solde (balances.js)

```javascript
// Automatique lors de GET /api/balances/all-balances
// Vérifie chaque provider
// Notifie si balance <= threshold
// Limite: 1 notification par provider par heure

if (balance <= CRITICAL_BALANCE_THRESHOLD) {
    await notifyAdmins({
        type: 'low_balance',
        title: '🚨 SOLDE CRITIQUE',
        message: `Provider ${provider}: ${balance} USD - Action immédiate!`,
        data: { provider, balance },
        link: '/config'
    });
}
```

## Migration

### Pour une installation existante

Exécutez:

```bash
# Option 1: Via MySQL CLI
mysql -u root -p broreps < server/sql/notifications.sql

# Option 2: Via PhpMyAdmin
# Importer server/sql/notifications.sql

# Option 3: Copier-coller dans SQL
# Le contenu de server/sql/notifications.sql
```

### Pour une nouvelle installation

La table `notifications` est automatiquement créée via `server/init-db.sql`.

## Tests

### Tester les notifications

```bash
# Backend: créer une notification test
curl -X POST http://localhost:3005/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system",
    "title": "Test Notification",
    "message": "Ceci est un test",
    "link": "/dashboard"
  }'

# Frontend: vérifier le badge et le dropdown
# Le compteur doit s'afficher
# Cliquer sur la cloche pour voir le dropdown
```

### Simuler un solde faible

1. Modifier `.env`:
   ```env
   LOW_BALANCE_THRESHOLD=1000
   ```

2. Reload balances via frontend (Dashboard > Solde)

3. Vérifier la notification dans la cloche

## Performance

- **Auto-refresh**: 30 secondes (configurable dans NotificationBell.tsx)
- **Limite par requête**: 20 notifications (configurable)
- **Throttling solde faible**: 1 notification/heure/provider
- **Index DB**: user_id + is_read pour requêtes rapides

## Personnalisation

### Ajouter un nouveau type de notification

1. **Backend - notifications.js**:
   ```javascript
   // Ajouter à l'ENUM dans notifications.sql
   type ENUM('...', 'mon_nouveau_type')
   ```

2. **Frontend - NotificationBell.tsx**:
   ```typescript
   const getNotificationIcon = (type: string) => {
       // ...
       case 'mon_nouveau_type':
           return <MonIcon size={18} className="text-color" />;
   }
   ```

3. **Utiliser dans le code**:
   ```javascript
   await notifyAdmins({
       type: 'mon_nouveau_type',
       title: 'Mon Titre',
       message: 'Mon message',
       link: '/ma-page'
   });
   ```

## Dépannage

### Les notifications n'apparaissent pas

1. Vérifier que la table existe:
   ```sql
   SHOW TABLES LIKE 'notifications';
   ```

2. Vérifier les logs backend:
   ```bash
   📢 Notification créée: [titre] (type) pour user [id]
   ```

3. Vérifier le token d'authentification

4. Ouvrir la console browser (F12) pour voir les erreurs

### Le compteur ne se met pas à jour

1. Vérifier l'auto-refresh (30s)
2. Cliquer sur le bouton refresh du dropdown
3. Vérifier les logs réseau (Network tab, F12)

### Migration échoue

Si `ALTER TABLE` échoue, recréez la table:

```sql
DROP TABLE IF EXISTS notifications;
-- Puis copiez le CREATE TABLE de init-db.sql
```

## Sécurité

- ✅ Toutes les routes protégées par `authenticateToken`
- ✅ Les utilisateurs ne voient que leurs propres notifications
- ✅ Les notifications globales (user_id=NULL) visibles par tous
- ✅ Validation des IDs (parseInt, isNaN checks)
- ✅ Prepared statements (SQL injection protection)

## Roadmap

- [ ] Notifications par email (optionnel)
- [ ] Son de notification (toggle)
- [ ] Filtrage par type dans le dropdown
- [ ] Pagination des anciennes notifications
- [ ] Webhooks pour intégrations externes
- [ ] SSE (Server-Sent Events) pour le push réel
