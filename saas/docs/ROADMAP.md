# 🗺 Roadmap SaaS - BroReps

## 🎯 Vision Produit
Construire un environnement Premium, fluide et hautement interactif, axé sur l'excellence de l'expérience utilisateur et du design. Le SaaS "BroReps" doit s'inscrire dans les standards des applications de pointe comme Stripe, Notion, Linear ou Vercel : minimalism, micro-interactions, ombres douces et dark mode sophistiqué.

## 🧠 Positionnement UX
- **Minimalisme & Clarté** : L'interface doit s'effacer au profit du contenu et des actions clés. On utilise abondamment l'espace blanc (ou noir).
- **Réactivité Pulsionnelle** : Micro-interactions immédiates (animations bouton, hover states progressifs) via Framer Motion.
- **Responsive Parfait** : Approche Mobile-first par conception, utilisation intelligente de l'espace étendu sur Desktop.
- **Accessibilité & Premium** : Contraste maîtrisé (Dark/Light mode typé), typographie lisible et élégante, hiérarchie visuelle stricte.

## 🏗 Architecture Front-end (React SPA)
- **Framework** : React + Vite
- **Routing** : React Router
- **Styling** : Tailwind CSS (v4) + clsx / tailwind-merge
- **Animations** : Framer Motion
- **Icônes** : Lucide React
- **Composants Base** : Approche modulaire (inspiration Shadcn/ui)

## 🧩 Pages Prévues
1. **Landing Page** : Vitrine du SaaS (Hero impactant, caractéristiques, pricing card, social proof, FAQ).
2. **Authentification** : Modules Login/Register/Forgot Password ultra clairs, fluides et sécurisants.
3. **Dashboard** : Centre de contrôle premium de l'utilisateur, avec metrics et graphiques.
4. **Notes / Modules** : Espace d'apprentissage ou de travail avec sidebar moderne, liste des ressources et contenus.
5. **Paramètres / Profil** : Gestion du compte avec une ergonomie sans faille.

## ✅ Features Prévues
- [ ] Système d'authentification UI complet et robuste.
- [ ] Dashboard metrics avec cards modernes et graphiques.
- [ ] Dark Mode support natif (ou Dark only si tel est le parti pris de départ) avec palette définie.
- [ ] Système de Notifications (Toasts animés avec Framer Motion).
- [ ] Command Palette (Cmd+K) intelligente.
- [ ] Composants réutilisables complets : Button, Card, Modal, Tooltip, Input, Skeleton loaders.
- [ ] Modèles de données avec "Empty States" élégants.

## 🗺 Roadmap par Phases

### Phase 1 : Design System & Fondations (En cours)
- [x] Initialisation de la documentation (`/docs`).
- [x] Définition du Design System : Couleurs, Typographie, Espacements, Principes UX.
- [ ] Refonte et paramétrage du fichier global CSS/Tailwind (CSS variables ou config Tailwind complète).
- [ ] Création du dossier `src/components/ui` et des premiers composants isolés : (Button, Card, Input, Badge).

### Phase 2 : Core Layout & Authentification
- [ ] Création / Refactor du Shell d'application (Sidebar, Header, Topbar, Layout Principal).
- [ ] Intégration des Layouts d'authentification (Split screen moderne ou Modal centrale épurée).
- [ ] Animations Framer Motion sur les changements de page et l'ouverture de menus.

### Phase 3 : Landing Page & Marketing
- [ ] Implémentation du Hero section premium.
- [ ] Défilement de logos (Social proof), Feature Blocks avec icônes.
- [ ] Cartes de Pricing avec animations au hover et mise en avant de l'offre recommandée.
- [ ] Composant FAQ interactif (Accordion).

### Phase 4 : Dashboard & Data
- [ ] Skeleton loaders pour les zones asynchrones (Dashboard).
- [ ] Composants Data : Tables stylisées (Bordures propres, hover rows), Stat Cards.
- [ ] Empty states attrayants avec icônes et Call-to-actions explicites.

### Phase 5 : Polishing & Optimisations
- [ ] Command Palette (Cmd+K).
- [ ] Toast Notifications pour tout le feedback utilisateur.
- [ ] Revue globale d'accessibilité (Aria, Focus states visibles mais discrets).
- [ ] Revue Mobile & Tablette au pixel près.
