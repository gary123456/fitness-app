import imageCompression from 'browser-image-compression';

/**
 * Compresse un fichier image côté client
 * @param file - Le fichier image à compresser
 * @returns Le fichier compressé
 */
export async function compressImageFile(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Limite à 1MB
    maxWidthOrHeight: 1920, // Dimension maximale de 1920px
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Erreur lors de la compression de l\'image:', error);
    throw error;
  }
}
