import { Comment, User, Like } from '../models';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { sequelize } from '../config/database';

export class CommentService {
  static async listByPaper(paperId: number, userId?: number) {
    // Get top-level comments with replies (2 levels deep)
    const comments = await Comment.findAll({
      where: { paper_id: paperId, parent_id: null },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'real_name', 'username', 'avatar_url'],
        },
        {
          model: Like,
          as: 'likes',
          attributes: ['user_id'],
        },
        {
          model: Comment,
          as: 'replies',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'real_name', 'username', 'avatar_url'],
            },
            {
              model: Like,
              as: 'likes',
              attributes: ['user_id'],
            },
            {
              model: Comment,
              as: 'replies',
              include: [
                {
                  model: User,
                  as: 'user',
                  attributes: ['id', 'real_name', 'username', 'avatar_url'],
                },
                {
                  model: Like,
                  as: 'likes',
                  attributes: ['user_id'],
                },
              ],
              order: [['created_at', 'ASC']],
            },
          ],
          order: [['created_at', 'ASC']],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    // Transform to add like_count and user_has_liked
    const transformComment = (comment: any): any => {
      const json = comment.toJSON ? comment.toJSON() : comment;
      return {
        ...json,
        like_count: json.likes?.length || 0,
        user_has_liked: userId ? json.likes?.some((l: any) => l.user_id === userId) : false,
        likes: undefined, // remove raw likes array
        replies: json.replies?.map(transformComment) || [],
      };
    };

    return comments.map(transformComment);
  }

  static async create(data: {
    paper_id: number;
    user_id: number;
    content: string;
    parent_id?: number;
  }) {
    const comment = await Comment.create({
      paper_id: data.paper_id,
      user_id: data.user_id,
      content: data.content,
      parent_id: data.parent_id || null,
    });

    const fullComment = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'real_name', 'username', 'avatar_url'],
        },
      ],
    });

    return {
      ...fullComment!.toJSON(),
      like_count: 0,
      user_has_liked: false,
      replies: [],
    };
  }

  static async update(id: number, userId: number, content: string) {
    const comment = await Comment.findByPk(id);
    if (!comment) throw new NotFoundError('Comment');
    if (comment.user_id !== userId) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    await comment.update({ content });
    return comment;
  }

  static async delete(id: number, userId: number, userRole: string) {
    const comment = await Comment.findByPk(id);
    if (!comment) throw new NotFoundError('Comment');
    if (comment.user_id !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Delete all replies first
    await Comment.destroy({ where: { parent_id: id } });
    await Like.destroy({ where: { comment_id: id } });
    await comment.destroy();
  }

  static async toggleLike(commentId: number, userId: number) {
    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new NotFoundError('Comment');

    const existing = await Like.findOne({
      where: { comment_id: commentId, user_id: userId },
    });

    if (existing) {
      await existing.destroy();
      const count = await Like.count({ where: { comment_id: commentId } });
      return { liked: false, like_count: count };
    } else {
      await Like.create({ comment_id: commentId, user_id: userId });
      const count = await Like.count({ where: { comment_id: commentId } });
      return { liked: true, like_count: count };
    }
  }
}
