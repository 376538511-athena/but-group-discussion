import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../middleware/authMiddleware';
import { PaperService } from '../services/paperService';
import { parsePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export class PaperController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req.query as any);
      const result = await PaperService.list(
        {
          ...pagination,
          search: req.query.search as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          sort: req.query.sort as string,
          order: req.query.order as string,
        },
        req.user?.id
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paper = await PaperService.getById(parseInt(req.params.id), req.user?.id);
      res.json({ success: true, data: paper });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'PDF file is required' },
        });
      }

      const paper = await PaperService.create({
        title: req.body.title,
        authors: req.body.authors,
        abstract: req.body.abstract,
        file_path: req.file.filename,
        file_size: req.file.size,
        original_filename: req.file.originalname,
        uploader_id: req.user!.id,
        presentation_date: req.body.presentation_date,
      });

      res.status(201).json({ success: true, data: paper });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paper = await PaperService.update(
        parseInt(req.params.id),
        req.user!.id,
        req.user!.role,
        req.body
      );
      res.json({ success: true, data: paper });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaperService.delete(
        parseInt(req.params.id),
        req.user!.id,
        req.user!.role
      );

      // Delete the file
      const filePath = path.join(
        process.env.UPLOAD_BASE_PATH || './uploads',
        'papers',
        result.file_path
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ success: true, message: 'Paper deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async download(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const paper = await PaperService.getById(parseInt(req.params.id));
      const filePath = path.join(
        process.env.UPLOAD_BASE_PATH || './uploads',
        'papers',
        (paper as any).file_path
      );

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('File');
      }

      const downloadName = (paper as any).original_filename || `paper-${paper.id}.pdf`;
      res.download(filePath, downloadName);
    } catch (error) {
      next(error);
    }
  }
}
