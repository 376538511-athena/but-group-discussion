import { Router } from 'express';
import { CommentController } from '../controllers/commentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/papers/:paperId/comments', CommentController.list);
router.post('/papers/:paperId/comments', CommentController.create);
router.put('/comments/:id', CommentController.update);
router.delete('/comments/:id', CommentController.delete);
router.post('/comments/:id/like', CommentController.toggleLike);

export default router;
