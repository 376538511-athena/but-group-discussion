import type { Note, NoteAttachment } from '../types/note';
import { apiSuccess } from '../lib/api';
import { getCurrentProfile } from '../lib/database';
import { noteBucket, supabase } from '../lib/supabase';

type NoteRow = {
  id: number;
  title: string;
  note_date: string;
  summary: string | null;
  attachments: NoteAttachment[] | null;
  uploader_id: string;
  created_at: string;
  updated_at: string;
  uploader:
    | { id: string; real_name: string; username: string }
    | { id: string; real_name: string; username: string }[]
    | null;
};

function buildSafeFileName(originalName: string): string {
  const extensionMatch = originalName.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || '';
  const baseName = originalName.replace(/(\.[^.]+)$/, '');

  const sanitizedBaseName = baseName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();

  const fallbackBaseName = sanitizedBaseName || 'note';
  const trimmedBaseName = fallbackBaseName.slice(0, 120);
  const safeExtension = extension.replace(/[^a-z0-9.]/g, '');

  return `${Date.now()}-${trimmedBaseName}${safeExtension}`;
}

async function attachSignedUrls(notes: Note[]): Promise<Note[]> {
  const paths = notes.flatMap((note) => note.attachments.map((attachment) => attachment.path));
  if (paths.length === 0) {
    return notes;
  }

  const { data, error } = await supabase.storage.from(noteBucket).createSignedUrls(paths, 60 * 60);
  if (error || !data) {
    return notes;
  }

  const urlMap = new Map<string, string | null>();
  data.forEach((entry, index) => {
    urlMap.set(paths[index], entry?.signedUrl || null);
  });

  return notes.map((note) => ({
    ...note,
    attachments: note.attachments.map((attachment) => ({
      ...attachment,
      url: urlMap.get(attachment.path) ?? null,
    })),
  }));
}

function mapNote(row: NoteRow): Note {
  const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader;
  return {
    id: row.id,
    title: row.title,
    note_date: row.note_date,
    summary: row.summary,
    attachments: row.attachments || [],
    uploader_id: row.uploader_id,
    uploader: uploader || { id: row.uploader_id, real_name: '未知用户', username: 'unknown' },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listByUploaderId(uploaderId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(
      'id, title, note_date, summary, attachments, uploader_id, created_at, updated_at, uploader:profiles!notes_uploader_id_fkey(id, real_name, username)'
    )
    .eq('uploader_id', uploaderId)
    .order('note_date', { ascending: false });

  if (error) {
    throw new Error(error.message || '获取笔记失败');
  }

  return attachSignedUrls(((data || []) as NoteRow[]).map(mapNote));
}

export const notesApi = {
  async listMine() {
    const currentUser = await getCurrentProfile();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    return apiSuccess(await listByUploaderId(currentUser.id));
  },

  async listByUser(userId: string) {
    return apiSuccess(await listByUploaderId(userId));
  },

  async create(params: {
    title: string;
    note_date: string;
    summary?: string;
    files: File[];
  }) {
    const currentUser = await getCurrentProfile();
    if (!currentUser) {
      throw new Error('请先登录');
    }

    if (params.files.length === 0) {
      throw new Error('请先上传笔记文件');
    }

    const uploadedPaths: string[] = [];

    try {
      const attachments: NoteAttachment[] = [];
      for (const file of params.files) {
        const safeName = buildSafeFileName(file.name);
        const filePath = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from(noteBucket)
          .upload(filePath, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message || '笔记文件上传失败');
        }

        uploadedPaths.push(filePath);
        attachments.push({
          path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
        });
      }

      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: params.title,
          note_date: params.note_date,
          summary: params.summary?.trim() || null,
          attachments,
          uploader_id: currentUser.id,
        })
        .select(
          'id, title, note_date, summary, attachments, uploader_id, created_at, updated_at, uploader:profiles!notes_uploader_id_fkey(id, real_name, username)'
        )
        .single();

      if (error) {
        throw new Error(error.message || '笔记保存失败');
      }

      const [note] = await attachSignedUrls([mapNote(data as NoteRow)]);
      return apiSuccess(note);
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(noteBucket).remove(uploadedPaths);
      }
      throw error;
    }
  },
};
