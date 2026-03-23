import { Router } from 'express';
import { PaperController } from '../controllers/paperController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../config/upload';

const router = Router();

router.use(authMiddleware);

router.get('/', PaperController.list);
router.get('/:id', PaperController.getById);
router.post('/', upload.single('file'), PaperController.create);
router.put('/:id', PaperController.update);
router.delete('/:id', PaperController.delete);
router.get('/:id/download', PaperController.download);

export default router;
