# 🎨 Design System BroReps

## 🎯 Principes UX Fondamentaux
- **Performance Apparente** : L'app doit sembler instantanée. Tous les changements d'état (`hover`, `focus`, `active`) s'accompagnent de transitions (`transition-all duration-300 ease-out`).
- **Feedback Immédiat** : Afficher distinctement les états. Les actions asynchrones bloquent les clics et affichent un spinner subtil.
- **Respiration (Whitespace)** : L'information doit respirer. Ne pas avoir peur du vide. Les interfaces Premium (Linear/Vercel) s'appuient sur des espacements généreux et symétriques.
- **Sobriété et Subtilité** : Utiliser des bordures de `1px` avec une opacité très faible (`border-white/5` ou `border-[#18181b]`) au lieu des pleins forts.

## 🎨 Palette de Couleurs (Dark First)

### Fonds (Backgrounds)
- **Base (Main BG)** : `#000000` ou `#050505` (Noir profond).
- **Primary Surface (Cards, Modals)** : `#0A0A0A` (Gris très foncé, relief 1).
- **Secondary Surface (Hover, Inputs)** : `#111111` ou `#18181b` (zinc-900, relief 2).

### Bordures
- **Default Border** : `#18181b` (zinc-900) ou `white/10`.
- **Active/Focus Ring** : `#00A336` (Vert BroReps) ou blanc pur en fonction du contexte, avec un léger offset (`ring-offset-[#0A0A0A]`).

### Textes (Typographie)
- **Primary Text (Titres, valeurs clés)** : `#FFFFFF` (Blanc pur) ou `#F4F4F5` (zinc-100).
- **Secondary Text (Descriptions, Labels)** : `#A1A1AA` (zinc-400).
- **Disabled/Muted Text** : `#52525B` (zinc-600).

### Couleurs de Marque (Brand)
- **Primaire (Vert BroReps Base)** : `#00A336`
- **Primaire Hover / Accent** : `#00FF7F` (Vert fluo pour micro-animations, glow, badges actifs).
- **Primaire Muted (Background semi-transparent)** : `#052e16`

## 🅰️ Typographies (Scale & Hierarchy)
- **Famille** : Sans Serif Moderne et Propre (*Inter*, *Geist*, ou équivalent).
- **Règles d'application :**
  - **Hero (`h1`)** : `text-4xl` à `text-6xl`, `font-extrabold`, `tracking-tight` (spacing resserré).
  - **Section (`h2`)** : `text-2xl` à `text-3xl`, `font-bold`, `tracking-tight`.
  - **Body / Texte courant** : `text-[14px]` ou `text-[15px]`, `leading-relaxed`, contraste modéré (`text-zinc-400`).
  - **Labels / Overlines** : `text-[12px]`, `uppercase`, `tracking-widest`, `font-semibold`.

## 🧱 Spacing System (Espaces maîtrisés)
- Utilisation stricte des valeurs Tailwind avec des rythmes fixes :
  - **Inter-éléments (Composants serrés)** : `gap-1`, `gap-2` (4px, 8px).
  - **Padding Conteneur (Cards)** : `p-4` (16px), `p-6` (24px).
  - **Sections principales (Pages)** : `py-16`, `py-24` Desktop, `py-8` Mobile.

## 🌗 Ombres Réfléchies (Glow Shadows)
En mode sombre pur, les ombres noires traditionnelles ne se voient pas.
- Remplacer les drop-shadows par des **lueurs colorées ou blanches subtiles**.
- Ex : Pour le bouton premium : `shadow-[0_0_20px_rgba(0,163,54,0.3)]`.
- Ex : Pour le Header/Navbar : Glow subtil bas `shadow-[0_4px_45px_rgba(0,163,54,0.15)]`.

## 🧩 UI Components List (Objectifs Shadcn/ui adaptés)

Ces composants devront être implémentés de façon décorrélée de leurs vues.

1. **Button** :
   - *Primary* : Bg `#00A336` (ou dégradé), Hover plus clair, effet scale on press (`active:scale-95`).
   - *Secondary* : Bg `#111111`, texte blanc, border zinc-800.
2. **Card** :
   - Apparence nette : Bg `#0A0A0A`, bordure `#18181b`, `rounded-xl` ou `rounded-2xl`. Pas de content débordant (`overflow-hidden`).
3. **Input / Form** :
   - Fond très sombre, focus-visible : `ring-2 ring-[#00A336]/50`. Label explicite, message d'erreur en rouge doux (ex: rose-500).
4. **Badges** :
   - Affichage type "Pill" (`rounded-full`), version outline (`border-zinc-800`) ou pleine (teinte de Primary très transparente).
5. **Modal / Dialog** :
   - Backdrop overlay : `#000000/80` avec un léger blur (`backdrop-blur-sm`).
   - Modal container : apparition depuis le bas, ou zoom (`scale 0.95 -> 1`) via Framer Motion.
6. **Tooltip** :
   - Nécessaire pour expliquer les icônes (ex: Navigation). Apparition rapide (`duration-150`).
7. **Toasts** :
   - Affichés en bas à droite (ou top center). Animation slide-in. Style très sobre.
8. **Skeleton / Empty State** :
   - Skeleton : div `bg-[#18181b]` avec `animate-pulse`.
   - Empty State : Icône (Lucide) centrée, gris clair, petit texte d'aide, et souvent un Button d'action `+ Créer`.
