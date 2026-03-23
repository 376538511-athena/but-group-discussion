import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { StatsService } from '../services/statsService';

export class StatsController {
  static async overview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await StatsService.overview(req.user!.id);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async participation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const matrix = await StatsService.participationMatrix();
      res.json({ success: true, data: matrix });
    } catch (error) {
      next(error);
    }
  }

  static async userStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await StatsService.userStats(parseInt(req.params.id));
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
