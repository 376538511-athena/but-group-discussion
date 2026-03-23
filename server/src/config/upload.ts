import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const uploadBasePath = process.env.UPLOAD_BASE_PATH || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadBasePath, 'papers'));
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});
