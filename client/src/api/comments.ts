import { apiSuccess } from '../lib/api';
import { buildCommentsForPaper, getCurrentProfile } from '../lib/database';
import { supabase } from '../lib/supabase';

export const commentsApi = {
  async list(paperId: number) {
    const user = await getCurrentProfile();
    const comments = await buildCommentsForPaper(paperId, user?.id);
    return apiSuccess(comments);
  },

  async create(paperId: number, data: { content: string; parent_id?: number }) {
    const user = await getCurrentProfile();
    if (!user) {
      throw new Error('请先登录');
    }

    const { data: inserted, error } = await supabase
      .from('comments')
      .insert({
        paper_id: paperId,
        user_id: user.id,
        parent_id: data.parent_id || null,
        content: data.content,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || '评论发表失败');
    }

    return apiSuccess(inserted);
  },

  async update(id: number, content: string) {
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || '评论更新失败');
    }

    return apiSuccess(data);
  },

  async delete(id: number) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) {
      throw new Error(error.message || '评论删除失败');
    }

    return apiSuccess(null, undefined, '评论已删除');
  },

  async toggleLike(id: number) {
    const user = await getCurrentProfile();
    if (!user) {
      throw new Error('请先登录');
    }

    const { data: existing, error: existingError } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .eq('comment_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message || '点赞操作失败');
    }

    if (existing) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || '取消点赞失败');
      }
    } else {
      const { error } = await supabase.from('comment_likes').insert({
        comment_id: id,
        user_id: user.id,
      });

      if (error) {
        throw new Error(error.message || '点赞失败');
      }
    }

    return apiSuccess(null);
  },
};
