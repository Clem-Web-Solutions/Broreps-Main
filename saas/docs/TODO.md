# 📋 TODO & Suivi de Projet

## ✅ Ce qui est fait
- [x] Configuration initiale du projet en Vite + React.
- [x] Installation des dépendances essentielles (Tailwind, Framer Motion, Lucide React).
- [x] Conception initiale du Header SaaS (Dark Theme avec touche de vert "Premium BroReps").
- [x] Initialisation de l'architecture documentaire structurée (`/docs`).

## 🔄 Ce qui est en cours
- **Phase 1 : Design System & Fondations**
  - Validation des palettes de couleurs dans la config ou les variables globales de l'app.
  - Standardisation des composants réutilisables (Création du dossier `components/ui` imminent).

## ⏳ Ce qui reste à faire

### Design System (Immédiat)
- [x] Créer le composant `Button` (variants : default, outline, ghost, link).
- [x] Créer les composants `Card`, `CardHeader`, `CardContent`.
- [x] Implémenter le système de `Tooltip`
- [x] Implémenter le système de `Badge`.
- [x] Créer le composant `Input`.

### Pages Core (Court / Moyen terme)
- [ ] **Landing Page** : Hero impactant + Animated Features + Pricing + Social Proof.
- [x] **Auth Flow** : Mettre au propre les vues de Login/Register avec design épuré type Vercel.
- [x] **Dashboard** : Remplacement des vues par défaut par des Cards, Tables propres, et graphiques interactifs (Recharts ou équivalent).
- [x] **Layout** : Ajuster la structure principale avec potentiellement une Sidebar premium réductible ou command-menu style.
- [x] **Vues de Contenu** : Formatter les cours / modules (Mes Notes) de façon très claire, sans distractions.

### Expérience Utilisateur
- [x] Ajouter des Skeleton loaders pour le chargement des dashboards/pages asynchrones.
- [ ] Compléter les "Empty states" (ex: pas encore de notes, pas encore de points).
- [ ] Assurer des focus states impeccables sur tous les inputs / boutons.
- [x] Intégrer un système de Toasts global pour la validation des actions utilisateur.

## 🧠 Améliorations futures
- [x] **Command Palette** : Navigation rapide au clavier (Cmd+K) type Raycast / Linear pour chercher modules, paramètres, se déconnecter.
- [ ] **Transitions Pages** : Mouvements subtils au changement de vue via Framer Motion.
- **Fluid Typography** : Adopter des typographies s'ajustant au clamp CSS pour une lisibilité parfaite sur toutes les tailles d'écran de façon fluide.
- **PWA Support** : Possibilité d'installer le SaaS en tant qu'application autonome sur mobile/desktop.
