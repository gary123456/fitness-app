import imageCompression from 'browser-image-compression';

/**
 * Compresse un fichier image côté client (Standard Silicon Valley)
 */
export async function compressImageFile(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5, // 500 KB (Ultra rapide à uploader)
    maxWidthOrHeight: 1080, // Résolution HD pour mobile
    useWebWorker: true,
    fileType: 'image/webp' as const, // Format WebP (30% plus léger que JPEG)
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Erreur lors de la compression de l\'image:', error);
    throw error;
  }
}