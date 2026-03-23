import { User } from '../models';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import bcrypt from 'bcryptjs';

export class UserService {
  static async list() {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['real_name', 'ASC']],
    });
    return users;
  }

  static async getById(id: number) {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  static async update(id: number, requesterId: number, requesterRole: string, data: Partial<{
    real_name: string;
    email: string;
    student_id: string;
    research_direction: string;
    avatar_url: string;
  }>) {
    if (id !== requesterId && requesterRole !== 'admin') {
      throw new ForbiddenError('You can only edit your own profile');
    }

    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError('User');

    await user.update(data);
    const { password_hash, ...userData } = user.toJSON() as any;
    return userData;
  }

  static async updateRole(id: number, role: 'admin' | 'member') {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError('User');
    await user.update({ role });
    return { id: user.id, role: user.role };
  }

  static async updateStatus(id: number, is_active: boolean) {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError('User');
    await user.update({ is_active });
    return { id: user.id, is_active: user.is_active };
  }

  static async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError('User');

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new ForbiddenError('Old password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await user.update({ password_hash });
  }
}
