import type { Comment } from '../types/comment';
import type { Paper } from '../types/paper';
import type { User } from '../types/user';
import { supabase } from './supabase';

type ProfileRow = {
  id: string;
  username: string;
  email: string;
  real_name: string;
  student_id: string | null;
  research_direction: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type PaperRow = {
  id: number;
  title: string;
  authors: string;
  journal_source: string | null;
  abstract: string | null;
  file_path: string;
  file_size: number | null;
  original_filename: string | null;
  uploader_id: string;
  presentation_date: string | null;
  created_at: string;
  updated_at: string;
  uploader: Pick<ProfileRow, 'id' | 'real_name' | 'username'> | Pick<ProfileRow, 'id' | 'real_name' | 'username'>[] | null;
};

type CommentRow = {
  id: number;
  paper_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  user: Pick<ProfileRow, 'id' | 'real_name' | 'username' | 'avatar_url'> | Pick<ProfileRow, 'id' | 'real_name' | 'username' | 'avatar_url'>[] | null;
};

type CommentLikeRow = {
  comment_id: number;
  user_id: string;
};

function assertNoError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

export function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    real_name: row.real_name,
    student_id: row.student_id,
    research_direction: row.research_direction,
    avatar_url: row.avatar_url,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapPaper(row: PaperRow): Paper {
  const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader;
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    journal_source: row.journal_source,
    abstract: row.abstract,
    file_path: row.file_path,
    file_size: row.file_size,
    original_filename: row.original_filename,
    uploader_id: row.uploader_id,
    presentation_date: row.presentation_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    uploader: uploader || { id: row.uploader_id, real_name: '未知用户', username: 'unknown' },
  };
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<number, Comment>();
  const roots: Comment[] = [];

  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  commentMap.forEach((comment) => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(comment);
        return;
      }
    }

    roots.push(comment);
  });

  return roots;
}

export async function getCurrentSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  assertNoError(error, '获取当前登录用户失败');
  return data.user;
}

export async function getCurrentProfile(): Promise<User | null> {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionUser.id)
    .single();

  assertNoError(error, '获取用户资料失败');
  return mapProfile(data as ProfileRow);
}

export async function listProfiles(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('real_name', { ascending: true });

  assertNoError(error, '获取成员列表失败');
  return (data as ProfileRow[]).map(mapProfile);
}

export async function listActiveProfilesBasic() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, real_name, username, avatar_url')
    .eq('is_active', true)
    .order('real_name', { ascending: true });

  assertNoError(error, '获取成员信息失败');
  return data as Pick<User, 'id' | 'real_name' | 'username' | 'avatar_url'>[];
}

export async function listPapersRaw(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: string;
}) {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const sortField = params?.sort || 'created_at';
  const ascending = params?.order === 'asc';

  let query = supabase
    .from('papers')
    .select(
      'id, title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date, created_at, updated_at, uploader:profiles!papers_uploader_id_fkey(id, real_name, username)',
      { count: 'exact' }
    )
    .order(sortField, { ascending, nullsFirst: false })
    .range(from, to);

  if (params?.search) {
    query = query.or(
      `title.ilike.%${params.search}%,authors.ilike.%${params.search}%,journal_source.ilike.%${params.search}%,abstract.ilike.%${params.search}%`
    );
  }

  const { data, count, error } = await query;
  assertNoError(error, '获取文献列表失败');

  return {
    rows: (data || []) as PaperRow[],
    total: count || 0,
  };
}

export async function getPaperByIdRaw(id: number) {
  const { data, error } = await supabase
    .from('papers')
    .select(
      'id, title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date, created_at, updated_at, uploader:profiles!papers_uploader_id_fkey(id, real_name, username)'
    )
    .eq('id', id)
    .single();

  assertNoError(error, '获取文献信息失败');
  return data as PaperRow;
}

export async function listPaperCommentsRaw(paperId: number) {
  const { data, error } = await supabase
    .from('comments')
    .select(
      'id, paper_id, user_id, parent_id, content, created_at, updated_at, user:profiles!comments_user_id_fkey(id, real_name, username, avatar_url)'
    )
    .eq('paper_id', paperId)
    .order('created_at', { ascending: true });

  assertNoError(error, '获取评论失败');
  return (data || []) as CommentRow[];
}

export async function listCommentLikes(commentIds: number[]) {
  if (commentIds.length === 0) {
    return [] as CommentLikeRow[];
  }

  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', commentIds);

  assertNoError(error, '获取点赞信息失败');
  return (data || []) as CommentLikeRow[];
}

export async function buildCommentsForPaper(paperId: number, currentUserId?: string | null): Promise<Comment[]> {
  const rows = await listPaperCommentsRaw(paperId);
  const likes = await listCommentLikes(rows.map((row) => row.id));

  const likeCounts = new Map<number, number>();
  const likedByCurrentUser = new Set<number>();

  likes.forEach((like) => {
    likeCounts.set(like.comment_id, (likeCounts.get(like.comment_id) || 0) + 1);
    if (currentUserId && like.user_id === currentUserId) {
      likedByCurrentUser.add(like.comment_id);
    }
  });

  const comments = rows.map((row) => {
    const user = Array.isArray(row.user) ? row.user[0] : row.user;
    return {
      id: row.id,
      paper_id: row.paper_id,
      user_id: row.user_id,
      parent_id: row.parent_id,
      content: row.content,
      user: user || {
        id: row.user_id,
        real_name: '未知用户',
        username: 'unknown',
        avatar_url: null,
      },
      like_count: likeCounts.get(row.id) || 0,
      user_has_liked: likedByCurrentUser.has(row.id),
      replies: [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }) as Comment[];

  return buildCommentTree(comments);
}
