import { apiSuccess } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, mapPaper } from '../lib/database';
import type { Paper } from '../types/paper';

export const bookmarksApi = {
  // ── Paper bookmarks ─────────────────────────────────────────────────
  async listPaperBookmarks(): Promise<{ data: { data: Paper[] } }> {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data, error } = await supabase
      .from('paper_bookmarks')
      .select(
        'paper:papers!paper_bookmarks_paper_id_fkey(id, title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date, created_at, updated_at, uploader:profiles!papers_uploader_id_fkey(id, real_name, username))'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || '获取收藏失败');

    const papers = (data || [])
      .map((row: any) => row.paper)
      .filter(Boolean)
      .map((p: any) => mapPaper(p));

    return apiSuccess(papers);
  },

  async togglePaperBookmark(paperId: number): Promise<{ data: { data: { bookmarked: boolean } } }> {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data: existing } = await supabase
      .from('paper_bookmarks')
      .select('paper_id')
      .eq('paper_id', paperId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('paper_bookmarks')
        .delete()
        .eq('paper_id', paperId)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message || '取消收藏失败');
      return apiSuccess({ bookmarked: false });
    } else {
      const { error } = await supabase
        .from('paper_bookmarks')
        .insert({ paper_id: paperId, user_id: user.id });
      if (error) throw new Error(error.message || '收藏失败');
      return apiSuccess({ bookmarked: true });
    }
  },

  async isPaperBookmarked(paperId: number): Promise<boolean> {
    const user = await getCurrentProfile();
    if (!user) return false;

    const { data } = await supabase
      .from('paper_bookmarks')
      .select('paper_id')
      .eq('paper_id', paperId)
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data;
  },

  // ── Comment bookmarks ────────────────────────────────────────────────
  async listCommentBookmarks() {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data, error } = await supabase
      .from('comment_bookmarks')
      .select(
        'comment:comments!comment_bookmarks_comment_id_fkey(id, paper_id, user_id, content, created_at, is_featured, user:profiles!comments_user_id_fkey(id, real_name, username, avatar_url), paper:papers!comments_paper_id_fkey(id, title))'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message || '获取收藏评论失败');

    const comments = (data || [])
      .map((row: any) => row.comment)
      .filter(Boolean);

    return apiSuccess(comments);
  },

  async toggleCommentBookmark(commentId: number): Promise<{ data: { data: { bookmarked: boolean } } }> {
    const user = await getCurrentProfile();
    if (!user) throw new Error('请先登录');

    const { data: existing } = await supabase
      .from('comment_bookmarks')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('comment_bookmarks')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      if (error) throw new Error(error.message || '取消收藏失败');
      return apiSuccess({ bookmarked: false });
    } else {
      const { error } = await supabase
        .from('comment_bookmarks')
        .insert({ comment_id: commentId, user_id: user.id });
      if (error) throw new Error(error.message || '收藏失败');
      return apiSuccess({ bookmarked: true });
    }
  },
};
