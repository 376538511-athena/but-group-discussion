import { User } from './user';

export interface Paper {
  id: number;
  title: string;
  authors: string;
  abstract: string | null;
  file_path: string;
  file_size: number | null;
  original_filename: string | null;
  uploader_id: string;
  uploader: Pick<User, 'id' | 'real_name' | 'username'>;
  presentation_date: string | null;
  created_at: string;
  updated_at: string;
  comment_count?: number;
  commentor_count?: number;
  user_has_commented?: boolean;
  is_uploader?: boolean;
  participation?: {
    total_members: number;
    engaged_count: number;
    pending_count: number;
    engaged_members: Pick<User, 'id' | 'real_name' | 'username' | 'avatar_url'>[];
    pending_members: Pick<User, 'id' | 'real_name' | 'username' | 'avatar_url'>[];
  };
}
