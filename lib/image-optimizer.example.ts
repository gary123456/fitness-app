/**
 * Exemple d'utilisation de la fonction compressImageFile
 * 
 * Ce fichier montre comment utiliser la compression d'images
 * dans vos composants React ou handlers d'événements.
 */

import { compressImageFile } from './image-optimizer';

// Exemple 1: Dans un handler d'input file
export async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const compressedFile = await compressImageFile(file);
    console.log('Image originale:', file.size / 1024 / 1024, 'MB');
    console.log('Image compressée:', compressedFile.size / 1024 / 1024, 'MB');
    
    // Utilisez compressedFile pour l'upload vers Supabase
    // const { data, error } = await supabase.storage
    //   .from('bucket')
    //   .upload('path', compressedFile);
  } catch (error) {
    console.error('Erreur de compression:', error);
  }
}

// Exemple 2: Dans un composant avec drag & drop
export async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  
  if (file && file.type.startsWith('image/')) {
    const compressedFile = await compressImageFile(file);
    // Traiter le fichier compressé
  }
}
