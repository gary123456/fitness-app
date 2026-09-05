# 🧪 Guide de Test - Vivex PWA & Gamification

## 🚀 Démarrage Rapide

```bash
# Lancer le serveur de développement
npm run dev

# Ouvrir dans le navigateur
# http://localhost:3000/dashboard
```

---

## ✅ Tests à Effectuer

### Test 1 : Icônes PWA (Favicon)

**Desktop:**
1. Ouvrir http://localhost:3000/dashboard
2. Vérifier l'onglet du navigateur
3. ✅ Un favicon devrait apparaître (icône Vivex)

**Mobile (iOS/Android):**
1. Ouvrir Safari/Chrome mobile
2. Aller sur l'app → Menu → "Ajouter à l'écran d'accueil"
3. ✅ L'icône Vivex devrait apparaître (pas d'icône générique)

---

### Test 2 : Page Profil

**Navigation:**
1. Lancer l'app : `npm run dev`
2. Se connecter (si nécessaire)
3. Cliquer sur "Profil" dans la navbar
4. ✅ URL: http://localhost:3000/profile

**Éléments à Vérifier:**

#### Section 1: Niveau et XP
- ✅ Badge circulaire "Niveau 5" (gradient teal/cyan)
- ✅ Barre de progression XP (81.67% remplie)
- ✅ Texte: "2450 / 3000 XP"

#### Section 2: Streak
- ✅ Icône flamme orange/rouge
- ✅ Nombre "12" en gros
- ✅ 7 petites barres (5 oranges, 2 grises)
- ✅ Titre: "Série de Jours Actifs"

#### Section 3: Badges
- ✅ 3 badges colorés (débloqués):
  - ⭐ Premier Pas
  - 🏆 Warrior
  - 🔥 Constance
- ✅ 3 badges grisés (verrouillés):
  - ⚡ Titan
  - 🎯 Précision
  - 🏅 Légende
- ✅ Compteur: "3 / 6 badges obtenus"

#### Section 4: Statistiques
- ✅ 4 cartes en grille:
  - Entraînements: 47
  - Temps Total: 32h
  - Calories: 18.5k
  - Record Streak: 21

---

### Test 3 : Responsive Design

**Desktop (> 768px):**
- ✅ Navbar en haut avec tous les liens
- ✅ Badges sur 6 colonnes
- ✅ Stats sur 4 colonnes

**Mobile (< 768px):**
- ✅ Navbar en bas (bottom bar)
- ✅ Badges sur 3 colonnes
- ✅ Stats sur 2×2 grilles

---

### Test 4 : Dark Mode

**Basculer le thème:**
1. Cliquer sur l'icône Soleil/Lune (top right)
2. Vérifier que tous les éléments s'adaptent:
   - ✅ Fond: zinc-950 (dark)
   - ✅ Bordures: zinc-800
   - ✅ Textes: zinc-100 / zinc-400
   - ✅ Glassmorphism: bg-zinc-900/60 backdrop-blur-xl

---

## 🐛 Problèmes Connus

### Build Error (Non Bloquant)
```bash
npm run build
# ❌ ERROR: next-pwa + Turbopack incompatible
```

**Solution:**
- Utiliser `npm run dev` pour le développement
- OU désactiver Turbopack : `next build --no-turbopack`

---

## 📸 Captures d'Écran Attendues

### Page Profil (Light Mode)
- Fond blanc/gris clair
- Bordures zinc-200
- Gradients teal/cyan/orange visibles

### Page Profil (Dark Mode)
- Fond noir/zinc-950
- Bordures zinc-800
- Glassmorphism avec transparence

---

## ✅ Checklist de Validation

Cocher après chaque test réussi:

- [ ] Favicon visible dans l'onglet
- [ ] Page /profile accessible
- [ ] Section XP affichée correctement
- [ ] Streak avec flamme visible
- [ ] 6 badges (3 colorés, 3 grisés)
- [ ] 4 cartes de statistiques
- [ ] Responsive mobile OK
- [ ] Dark mode OK
- [ ] Navigation Profil dans Navbar
- [ ] Aucune erreur console

---

## 🚨 Si un Test Échoue

1. Vérifier que `npm run dev` est lancé
2. Vider le cache du navigateur (Ctrl+Shift+R)
3. Vérifier la console (F12) pour erreurs
4. Vérifier que tous les fichiers sont présents:
   - `app/icon.png`
   - `app/apple-icon.png`
   - `app/profile/page.tsx`

---

**Bonne chance! 🚀**
