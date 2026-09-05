# Configuration PWA et Compression d'Images - Vivex

## ✅ Tâches Complétées

### 1. Progressive Web App (PWA)

**Package installé:** `next-pwa@5.6.0`

**Fichiers modifiés/créés:**
- ✅ `next.config.ts` - Configuration withPWA avec destination 'public'
- ✅ `public/manifest.json` - Manifest PWA avec:
  - Nom: "Vivex"
  - Background: #09090b (zinc-950)
  - Theme Color: #14b8a6 (teal-500)
  - Icône: /icon.png (copié depuis logo.png)

**Fonctionnement:**
- Les Service Workers PWA sont **désactivés en développement** pour éviter les conflits
- En **production** (npm run build), next-pwa génère automatiquement:
  - `public/sw.js` - Service Worker principal
  - `public/workbox-*.js` - Scripts Workbox pour le caching
  - L'application devient installable sur mobile/desktop

### 2. Compression d'Images Client-Side

**Package:** `browser-image-compression@2.0.2` (déjà installé)

**Fichiers créés:**
- ✅ `lib/image-optimizer.ts` - Fonction utilitaire `compressImageFile()`
  - Limite: **1MB maximum**
  - Dimension max: **1920px**
  - Utilise Web Workers pour les performances
  - Format de sortie: JPEG

**Utilisation:**
```typescript
import { compressImageFile } from '@/lib/image-optimizer';

async function handleUpload(file: File) {
  const compressed = await compressImageFile(file);
  // Upload vers Supabase Storage...
}
```

## 🚀 Prochaines Étapes

1. **Tester la PWA:**
   ```bash
   npm run build
   npm start
   ```
   Puis ouvrir l'application et vérifier que l'option "Installer l'application" apparaît.

2. **Intégrer la compression d'images:**
   - Utiliser `compressImageFile()` dans les formulaires d'upload
   - Exemple: Upload d'images de profil, photos d'exercices, etc.

3. **Optimiser les icônes PWA:**
   - Créer des icônes optimisées pour différentes tailles (192x192, 512x512)
   - Actuellement, logo.png est utilisé pour toutes les tailles

## 📝 Notes

- **Design Glassmorphism:** Aucune modification UI n'a été effectuée
- **Coût tokens:** Approche ciblée avec modifications minimales
- **Sécurité:** Validation côté client avant upload vers Supabase
