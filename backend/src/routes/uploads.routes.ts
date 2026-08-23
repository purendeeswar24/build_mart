import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { AppError } from '../middleware/errorHandler.middleware';
import {
  ALLOWED_IMAGE_TYPES,
  UPLOAD_MAX_BYTES,
  ensureUploadsDir,
  uploadsDir,
} from '../config/uploads';

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new AppError('BAD_FILE', 'Use a JPG, PNG, WEBP, or GIF image.', 400));
      return;
    }
    cb(null, true);
  },
});

export const uploadsRouter = Router();

uploadsRouter.post('/', upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('BAD_FILE', 'Choose an image from your computer.', 400);
    }
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
    });
  } catch (err) {
    next(err);
  }
});
