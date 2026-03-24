export interface User {
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
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  real_name: string;
  student_id?: string;
  research_direction?: string;
}

export interface SignupVerificationData extends RegisterData {
  verification_code?: string;
}
