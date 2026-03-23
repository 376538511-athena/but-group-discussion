import { Router } from 'express';
import authRoutes from './authRoutes';
import paperRoutes from './paperRoutes';
import commentRoutes from './commentRoutes';
import userRoutes from './userRoutes';
import statsRoutes from './statsRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/papers', paperRoutes);
router.use('/', commentRoutes);
router.use('/users', userRoutes);
router.use('/stats', statsRoutes);

export default router;
