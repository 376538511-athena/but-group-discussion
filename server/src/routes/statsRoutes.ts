import { Router } from 'express';
import { StatsController } from '../controllers/statsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/overview', StatsController.overview);
router.get('/participation', StatsController.participation);
router.get('/user/:id', StatsController.userStats);

export default router;
