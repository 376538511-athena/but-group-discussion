import { Op } from 'sequelize';
import { User, Paper, Comment } from '../models';
import { sequelize } from '../config/database';

export class StatsService {
  static async overview(userId: number) {
    const totalPapers = await Paper.count();
    const totalComments = await Comment.count({ where: { user_id: userId } });
    const totalMembers = await User.count({ where: { is_active: true } });

    // Papers this user hasn't commented on (excluding papers they uploaded)
    const allPapers = await Paper.findAll({ attributes: ['id', 'uploader_id'] });
    const commentedPaperIds = (await Comment.findAll({
      where: { user_id: userId },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('paper_id')), 'paper_id']],
      raw: true,
    })).map((c: any) => c.paper_id);

    const pendingPapers = allPapers.filter(
      (p) => p.uploader_id !== userId && !commentedPaperIds.includes(p.id)
    );

    return {
      total_papers: totalPapers,
      my_comments: totalComments,
      total_members: totalMembers,
      pending_count: pendingPapers.length,
    };
  }

  static async participationMatrix() {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ['id', 'real_name', 'username'],
      order: [['real_name', 'ASC']],
    });

    const papers = await Paper.findAll({
      attributes: ['id', 'title', 'uploader_id'],
      order: [['created_at', 'DESC']],
      limit: 20,
    });

    const comments = await Comment.findAll({
      where: {
        paper_id: { [Op.in]: papers.map((p) => p.id) },
      },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('paper_id')), 'paper_id'], 'user_id'],
      group: ['paper_id', 'user_id'],
      raw: true,
    });

    const commentSet = new Set(
      comments.map((c: any) => `${c.user_id}-${c.paper_id}`)
    );

    const matrix = users.map((user) => ({
      user: { id: user.id, real_name: user.real_name, username: user.username },
      papers: papers.map((paper) => ({
        paper_id: paper.id,
        title: paper.title,
        is_uploader: (paper as any).uploader_id === user.id,
        has_commented: commentSet.has(`${user.id}-${paper.id}`),
      })),
    }));

    return { users, papers, matrix };
  }

  static async userStats(userId: number) {
    const papers = await Paper.findAll({
      attributes: ['id', 'title', 'uploader_id', 'created_at'],
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'uploader', attributes: ['real_name'] },
      ],
    });

    const commentedPaperIds = (await Comment.findAll({
      where: { user_id: userId },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('paper_id')), 'paper_id']],
      raw: true,
    })).map((c: any) => c.paper_id);

    return papers.map((paper) => ({
      ...paper.toJSON(),
      is_uploader: paper.uploader_id === userId,
      has_commented: commentedPaperIds.includes(paper.id),
    }));
  }
}
