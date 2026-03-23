import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole('admin'), UserController.list);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.update);
router.put('/:id/role', requireRole('admin'), UserController.updateRole);
router.put('/:id/status', requireRole('admin'), UserController.updateStatus);

export default router;
