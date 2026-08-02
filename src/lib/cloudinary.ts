/**
 * Utility functions for uploading audio/image files to Cloudinary
 * and extracting media metadata (e.g., audio duration).
 */

export interface CloudinaryUploadResponse {
  url: string;
  publicId?: string;
  duration?: number;
  format?: string;
}

/**
 * Extracts audio duration in seconds from an audio File.
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.round(audio.duration || 0);
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(180); // Default fallback 3 minutes
      });

      audio.src = objectUrl;
    } catch {
      resolve(180);
    }
  });
}

/**
 * Uploads a file (MP3/Audio/Image) to Cloudinary via server API or direct upload.
 */
export async function uploadToCloudinary(
  file: File,
  options: {
    folder?: string;
    resourceType?: 'auto' | 'video' | 'image' | 'raw';
    onProgress?: (progress: number) => void;
  } = {}
): Promise<CloudinaryUploadResponse> {
  const { folder = 'vibesync_songs', resourceType = 'auto', onProgress } = options;

  // Check if client-side direct upload is configured
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // 1. If client-side Cloudinary preset is set, upload directly with progress tracking
  if (cloudName && uploadPreset) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType === 'auto' ? 'video' : resourceType}/upload`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          resolve({
            url: res.secure_url || res.url,
            publicId: res.public_id,
            duration: res.duration ? Math.round(res.duration) : undefined,
            format: res.format,
          });
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error?.message || 'Cloudinary direct upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload'));
      xhr.open('POST', endpoint);
      xhr.send(formData);
    });
  }

  // 2. Otherwise, convert file to Base64 and upload via Next.js API route `/api/upload`
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (onProgress) {
      onProgress(10);
    }

    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        if (onProgress) onProgress(30);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64Data,
            folder,
            resourceType,
          }),
        });

        if (onProgress) onProgress(80);

        const data = await response.json();

        if (!response.ok) {
          const error = new Error(data.error || 'Failed to upload to Cloudinary');
          (error as any).isConfigError = data.isConfigError;
          throw error;
        }

        if (onProgress) onProgress(100);

        resolve({
          url: data.url,
          publicId: data.publicId,
          duration: data.duration ? Math.round(data.duration) : undefined,
          format: data.format,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file for upload'));
    reader.readAsDataURL(file);
  });
}
