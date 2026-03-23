import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserService } from '../services/userService';

export class UserController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await UserService.list();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getById(parseInt(req.params.id));
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.update(
        parseInt(req.params.id),
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await UserService.updateRole(
        parseInt(req.params.id),
        req.body.role
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await UserService.updateStatus(
        parseInt(req.params.id),
        req.body.is_active
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
