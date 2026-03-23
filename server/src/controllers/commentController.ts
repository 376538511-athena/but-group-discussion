import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { CommentService } from '../services/commentService';

export class CommentController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const comments = await CommentService.listByPaper(
        parseInt(req.params.paperId),
        req.user?.id
      );
      res.json({ success: true, data: comments });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const comment = await CommentService.create({
        paper_id: parseInt(req.params.paperId),
        user_id: req.user!.id,
        content: req.body.content,
        parent_id: req.body.parent_id,
      });
      res.status(201).json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const comment = await CommentService.update(
        parseInt(req.params.id),
        req.user!.id,
        req.body.content
      );
      res.json({ success: true, data: comment });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await CommentService.delete(
        parseInt(req.params.id),
        req.user!.id,
        req.user!.role
      );
      res.json({ success: true, message: 'Comment deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async toggleLike(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await CommentService.toggleLike(
        parseInt(req.params.id),
        req.user!.id
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
