import { User } from './user';

export interface Comment {
  id: number;
  paper_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  user: Pick<User, 'id' | 'real_name' | 'username' | 'avatar_url'>;
  like_count: number;
  user_has_liked: boolean;
  replies: Comment[];
  created_at: string;
  updated_at: string;
}
