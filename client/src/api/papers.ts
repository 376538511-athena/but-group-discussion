import type { Paper } from '../types/paper';
import { apiSuccess } from '../lib/api';
import {
  getCurrentProfile,
  getPaperByIdRaw,
  listActiveProfilesBasic,
  listPaperCommentsRaw,
  listPapersRaw,
  mapPaper,
} from '../lib/database';
import { storageBucket, supabase } from '../lib/supabase';

function buildSafeFileName(originalName: string): string {
  const extensionMatch = originalName.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || '.pdf';
  const baseName = originalName.replace(/(\.[^.]+)$/, '');

  const sanitizedBaseName = baseName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();

  const fallbackBaseName = sanitizedBaseName || 'paper';
  const trimmedBaseName = fallbackBaseName.slice(0, 120);
  const safeExtension = extension.replace(/[^a-z0-9.]/g, '') || '.pdf';

  return `${Date.now()}-${trimmedBaseName}${safeExtension}`;
}

function buildMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export const papersApi = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    order?: string;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const currentUser = await getCurrentProfile();
    const { rows, total } = await listPapersRaw(params);
    const papers = rows.map(mapPaper);

    const paperIds = papers.map((paper) => paper.id);
    let commentRows: { paper_id: number; user_id: string }[] = [];
    if (paperIds.length > 0) {
      const { data, error } = await supabase
        .from('comments')
        .select('paper_id, user_id')
        .in('paper_id', paperIds);

      if (error) {
        throw new Error(error.message || '获取评论统计失败');
      }

      commentRows = (data || []) as { paper_id: number; user_id: string }[];
    }

    const commentByPaper = new Map<number, { commentCount: number; commentorIds: Set<string> }>();
    commentRows.forEach((row) => {
      const entry = commentByPaper.get(row.paper_id) || {
        commentCount: 0,
        commentorIds: new Set<string>(),
      };
      entry.commentCount += 1;
      entry.commentorIds.add(row.user_id);
      commentByPaper.set(row.paper_id, entry);
    });

    const enriched = papers
      .filter((paper) => {
        if (!params?.startDate && !params?.endDate) {
          return true;
        }

        const created = new Date(paper.created_at).getTime();
        if (params.startDate && created < new Date(params.startDate).getTime()) {
          return false;
        }
        if (params.endDate && created > new Date(params.endDate).getTime()) {
          return false;
        }
        return true;
      })
      .map((paper) => {
        const stats = commentByPaper.get(paper.id);
        const commentorIds = stats?.commentorIds || new Set<string>();
        return {
          ...paper,
          comment_count: stats?.commentCount || 0,
          commentor_count: commentorIds.size,
          user_has_commented: currentUser ? commentorIds.has(currentUser.id) : false,
          is_uploader: currentUser ? currentUser.id === paper.uploader_id : false,
        } as Paper;
      });

    return apiSuccess(enriched, buildMeta(page, limit, total));
  },

  async getById(id: number) {
    const currentUser = await getCurrentProfile();
    const paper = mapPaper(await getPaperByIdRaw(id));
    const activeMembers = await listActiveProfilesBasic();
    const commentRows = await listPaperCommentsRaw(id);
    const commentedIds = new Set(commentRows.map((row) => row.user_id));

    const engagedMembers = activeMembers.filter((member) => commentedIds.has(member.id));
    const pendingMembers = activeMembers.filter(
      (member) => member.id !== paper.uploader_id && !commentedIds.has(member.id)
    );

    return apiSuccess({
      ...paper,
      user_has_commented: currentUser ? commentedIds.has(currentUser.id) : false,
      is_uploader: currentUser ? currentUser.id === paper.uploader_id : false,
      participation: {
        total_members: activeMembers.length,
        engaged_count: engagedMembers.length,
        pending_count: pendingMembers.length,
        engaged_members: engagedMembers,
        pending_members: pendingMembers,
      },
    });
  },

  async create(formData: FormData) {
    const currentUser = await getCurrentProfile();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new Error('请先选择 PDF 文件');
    }

    const safeName = buildSafeFileName(file.name);
    const filePath = `${currentUser.id}/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(filePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || '文件上传失败');
    }

    const payload = {
      title: String(formData.get('title') || ''),
      authors: String(formData.get('authors') || ''),
      journal_source: String(formData.get('journal_source') || '') || null,
      abstract: String(formData.get('abstract') || '') || null,
      presentation_date: String(formData.get('presentation_date') || '') || null,
      file_path: filePath,
      file_size: file.size,
      original_filename: file.name,
      uploader_id: currentUser.id,
    };

    const { data, error } = await supabase
      .from('papers')
      .insert(payload)
      .select(
        'id, title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date, created_at, updated_at, uploader:profiles!papers_uploader_id_fkey(id, real_name, username)'
      )
      .single();

    if (error) {
      await supabase.storage.from(storageBucket).remove([filePath]);
      throw new Error(error.message || '文献上传失败');
    }

    return apiSuccess(mapPaper(data as any));
  },

  async update(id: number, data: { title?: string; authors?: string; journal_source?: string | null; abstract?: string; presentation_date?: string }) {
    const { data: updated, error } = await supabase
      .from('papers')
      .update(data)
      .eq('id', id)
      .select(
        'id, title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date, created_at, updated_at, uploader:profiles!papers_uploader_id_fkey(id, real_name, username)'
      )
      .single();

    if (error) {
      throw new Error(error.message || '更新失败');
    }

    return apiSuccess(mapPaper(updated as any));
  },

  async delete(id: number) {
    const currentUser = await getCurrentProfile();
    const paper = mapPaper(await getPaperByIdRaw(id));
    if (!currentUser || currentUser.id !== paper.uploader_id) {
      throw new Error('只能删除自己上传的文献');
    }
    const { error } = await supabase.from('papers').delete().eq('id', id);
    if (error) {
      throw new Error(error.message || '删除失败');
    }

    await supabase.storage.from(storageBucket).remove([paper.file_path]);
    return apiSuccess(null, undefined, '文献已删除');
  },

  async download(id: number) {
    const paper = mapPaper(await getPaperByIdRaw(id));
    const { data, error } = await supabase.storage.from(storageBucket).download(paper.file_path);
    if (error || !data) {
      throw new Error(error?.message || '下载失败');
    }

    return {
      data,
    };
  },
};
