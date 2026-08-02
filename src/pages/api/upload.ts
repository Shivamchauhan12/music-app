import type { NextApiRequest, NextApiResponse } from 'next';
import { v2 as cloudinary } from 'cloudinary';

// Increase body parser size limit to 30mb for uploading MP3 files via base64
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { file, folder, resourceType } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided for upload.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;

    // Check configuration
    if (!cloudName || ( (!apiKey || !apiSecret) && !uploadPreset )) {
      return res.status(400).json({
        error: 'Cloudinary environment variables are missing. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) in your .env file.',
        isConfigError: true,
      });
    }

    // Configure Cloudinary SDK
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const uploadOptions: Record<string, any> = {
      resource_type: resourceType || 'auto',
      folder: folder || 'vibesync_songs',
    };

    if (uploadPreset && (!apiKey || !apiSecret)) {
      uploadOptions.upload_preset = uploadPreset;
    }

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return res.status(200).json({
      url: result.secure_url || result.url,
      publicId: result.public_id,
      duration: result.duration ? Math.round(result.duration) : undefined,
      format: result.format,
    });
  } catch (error: any) {
    console.error('Cloudinary API upload error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during Cloudinary upload.',
    });
  }
}
