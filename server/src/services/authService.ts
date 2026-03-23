import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { JWT_CONFIG } from '../config/auth';
import { AppError, UnauthorizedError, ValidationError } from '../utils/errors';

export class AuthService {
  static async register(data: {
    username: string;
    email: string;
    password: string;
    real_name: string;
    student_id?: string;
    research_direction?: string;
  }) {
    const existingUser = await User.findOne({
      where: { username: data.username },
    });
    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    const existingEmail = await User.findOne({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ValidationError('Email already exists');
    }

    const password_hash = await bcrypt.hash(data.password, 12);

    const user = await User.create({
      username: data.username,
      email: data.email,
      password_hash,
      real_name: data.real_name,
      student_id: data.student_id || null,
      research_direction: data.research_direction || null,
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      real_name: user.real_name,
      role: user.role,
    };
  }

  static async login(username: string, password: string) {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_CONFIG.accessSecret,
      { expiresIn: 7200 }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_CONFIG.refreshSecret,
      { expiresIn: 604800 }
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        real_name: user.real_name,
        role: user.role,
        student_id: user.student_id,
        research_direction: user.research_direction,
        avatar_url: user.avatar_url,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.refreshSecret) as { userId: number };
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.is_active) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_CONFIG.accessSecret,
        { expiresIn: 7200 }
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  static async getProfile(userId: number) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return user;
  }
}
