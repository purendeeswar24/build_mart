import fs from 'fs';
import path from 'path';

export const uploadsDir = path.resolve(__dirname, '../../uploads');

export function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
