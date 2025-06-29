/**
 * Converts a File to Base64 data URL
 */
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      reject(new Error('Please select a valid image file (JPG, PNG, or WebP)'));
      return;
    }

    // Validate file size (max 2MB for Base64 storage)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      reject(new Error('Image size must be less than 2MB'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Validates image file before processing
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Please select a valid image file (JPG, PNG, or WebP)' };
  }

  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size must be less than 2MB' };
  }

  return { isValid: true };
};

/**
 * Compresses image if needed (optional enhancement)
 */
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Convert file to data URL for the image element
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};