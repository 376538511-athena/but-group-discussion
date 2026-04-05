import type { User } from './user';

export interface NoteAttachment {
  path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string;
  url?: string | null;
}

export interface Note {
  id: number;
  title: string;
  note_date: string;
  summary: string | null;
  attachments: NoteAttachment[];
  uploader_id: string;
  uploader: Pick<User, 'id' | 'real_name' | 'username'>;
  created_at: string;
  updated_at: string;
}
