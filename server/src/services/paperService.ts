import { Op } from 'sequelize';
import { Paper, User, Comment } from '../models';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { PaginationParams, PaginationResult, paginationOffset } from '../utils/pagination';
import { sequelize } from '../config/database';

export class PaperService {
  static async list(params: PaginationParams & {
    search?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    order?: string;
  }, userId?: number): Promise<PaginationResult<any>> {
    const where: any = {};

    if (params.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${params.search}%` } },
        { authors: { [Op.iLike]: `%${params.search}%` } },
        { abstract: { [Op.iLike]: `%${params.search}%` } },
      ];
    }

    if (params.startDate || params.endDate) {
      where.created_at = {};
      if (params.startDate) where.created_at[Op.gte] = params.startDate;
      if (params.endDate) where.created_at[Op.lte] = params.endDate;
    }

    const sortField = params.sort || 'created_at';
    const sortOrder = params.order === 'asc' ? 'ASC' : 'DESC';

    const { count, rows } = await Paper.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'real_name', 'username'],
        },
      ],
      order: [[sortField, sortOrder]],
      limit: params.limit,
      offset: paginationOffset(params),
    });

    // Get comment counts and user participation status for each paper
    const papersWithStats = await Promise.all(
      rows.map(async (paper) => {
        const paperJson = paper.toJSON() as any;

        const commentCount = await Comment.count({
          where: { paper_id: paper.id },
        });

        const commentorCount = await Comment.count({
          where: { paper_id: paper.id },
          distinct: true,
          col: 'user_id',
        });

        let userHasCommented = false;
        if (userId) {
          const userComment = await Comment.findOne({
            where: { paper_id: paper.id, user_id: userId },
          });
          userHasCommented = !!userComment;
        }

        return {
          ...paperJson,
          comment_count: commentCount,
          commentor_count: commentorCount,
          user_has_commented: userHasCommented,
          is_uploader: userId ? paper.uploader_id === userId : false,
        };
      })
    );

    return {
      data: papersWithStats,
      meta: {
        page: params.page,
        limit: params.limit,
        total: count,
        totalPages: Math.ceil(count / params.limit),
      },
    };
  }

  static async getById(id: number, userId?: number) {
    const paper = await Paper.findByPk(id, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'real_name', 'username'],
        },
      ],
    });

    if (!paper) {
      throw new NotFoundError('Paper');
    }

    const paperJson = paper.toJSON() as any;

    // Get participation stats
    const totalActiveMembers = await User.count({ where: { is_active: true } });
    const commentedUserIds = await Comment.findAll({
      where: { paper_id: id },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('user_id')), 'user_id']],
      raw: true,
    });

    const commentedIds = commentedUserIds.map((c: any) => c.user_id);

    const engagedMembers = await User.findAll({
      where: { id: { [Op.in]: commentedIds }, is_active: true },
      attributes: ['id', 'real_name', 'username', 'avatar_url'],
    });

    const pendingMembers = await User.findAll({
      where: {
        id: { [Op.notIn]: [...commentedIds, paper.uploader_id] },
        is_active: true,
      },
      attributes: ['id', 'real_name', 'username', 'avatar_url'],
    });

    let userHasCommented = false;
    if (userId) {
      userHasCommented = commentedIds.includes(userId);
    }

    return {
      ...paperJson,
      user_has_commented: userHasCommented,
      is_uploader: userId ? paper.uploader_id === userId : false,
      participation: {
        total_members: totalActiveMembers,
        engaged_count: engagedMembers.length,
        pending_count: pendingMembers.length,
        engaged_members: engagedMembers,
        pending_members: pendingMembers,
      },
    };
  }

  static async create(data: {
    title: string;
    authors: string;
    abstract?: string;
    file_path: string;
    file_size?: number;
    original_filename?: string;
    uploader_id: number;
    presentation_date?: string;
  }) {
    const paper = await Paper.create({
      title: data.title,
      authors: data.authors,
      abstract: data.abstract || null,
      file_path: data.file_path,
      file_size: data.file_size || null,
      original_filename: data.original_filename || null,
      uploader_id: data.uploader_id,
      presentation_date: data.presentation_date ? new Date(data.presentation_date) : null,
    });

    return paper;
  }

  static async update(id: number, userId: number, userRole: string, data: Partial<{
    title: string;
    authors: string;
    abstract: string;
    presentation_date: string;
  }>) {
    const paper = await Paper.findByPk(id);
    if (!paper) throw new NotFoundError('Paper');
    if (paper.uploader_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Only the uploader or admin can edit this paper');
    }

    const updateData: any = { ...data };
    if (data.presentation_date) {
      updateData.presentation_date = new Date(data.presentation_date);
    }
    await paper.update(updateData);
    return paper;
  }

  static async delete(id: number, userId: number, userRole: string) {
    const paper = await Paper.findByPk(id);
    if (!paper) throw new NotFoundError('Paper');
    if (paper.uploader_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Only the uploader or admin can delete this paper');
    }

    await paper.destroy();
    return { file_path: paper.file_path };
  }
}
