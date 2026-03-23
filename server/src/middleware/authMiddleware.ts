import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/auth';
import { User } from '../models';
import { UnauthorizedError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'admin' | 'member';
    real_name: string;
  };
}

export const authMiddleware = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_CONFIG.accessSecret) as {
      userId: number;
      role: string;
    };

    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'role', 'real_name', 'is_active'],
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedError('User not found or inactive');
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      real_name: user.real_name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};
