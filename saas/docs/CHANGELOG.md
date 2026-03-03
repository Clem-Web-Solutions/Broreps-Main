# 📝 Changelog SaaS BroReps

Toutes les modifications notables apportées à la partie web (SaaS) seront documentées dans ce fichier. Le format se base sur [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] - En cours

### Ajouté
- **Command Palette (Cmd+K)** : Intégration globale via `Framer Motion` pour une navigation et des actions expertes rapides.
- **Système de notifications (Toasts)** : Implémentation complète via Context API et Framer Motion (succès, erreur, info) pour des feedbacks instantanés.
- **Design System UI** : Création des premiers composants réutilisables `Button`, `Card`, `Badge` et `Input` dans `src/components/ui/` avec l'utilitaire `cn()`.
- Initialisation de l'architecture documentaire Premium (`/docs/ROADMAP.md`, `TODO.md`, `CHANGELOG.md`, `DESIGN_SYSTEM.md`).
- Définition des standards Design (Inspiration Stripe, Vercel, Framer).
- Structuration des objectifs : "Minimaliste, Premium, Moderne, Micro-interactions".

### UX/UI
- **Mise à jour NotesPage** : Refactor complet façon Bento Grid. Intégration des Cards, Textarea premium, Button et animations motion, apportant une interface "sans distraction".
- **Mise à jour Auth Flow** : Refactorisation complète de `LoginPage` avec les composants `Card`, `Button`, `Input` et des animations fluides Framer Motion.
- **Mise à jour Dashboard** : Intégration de `Skeleton` loaders pour le chargement des modules et redesign subtil des Cards de stats.
- Redéfinition du niveau de qualité attendu (Standard Vercel/Linear/Stripe).
- Priorisation accordée aux animations ultra-fluides, skeleton loaders, et dark mode chic.
- Approche Mobile First systématique sur la roadmap.

### Refactor
- Mise en avant d'une hiérarchie de fichiers UI modulaires et réutilisables qui sera le premier objectif de développement de la Phase 1.
