import type { LoginData, RegisterData, SignupVerificationData, User } from '../types/user';
import { apiSuccess } from '../lib/api';
import { getCurrentProfile } from '../lib/database';
import { supabase } from '../lib/supabase';

async function requireProfile(): Promise<User> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error('当前用户资料不存在，请检查 Supabase 配置。');
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('当前账号已被停用，请联系管理员。');
  }
  return profile;
}

export const authApi = {
  async register(data: RegisterData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username,
          real_name: data.real_name,
          student_id: data.student_id || null,
          research_direction: data.research_direction || null,
        },
      },
    });

    if (error) {
      throw new Error(error.message || '注册失败');
    }

    const user = authData.user;
    if (!user) {
      throw new Error('注册失败，请稍后重试。');
    }

    return apiSuccess({
      userId: user.id,
      email: data.email,
      requiresVerification: true,
    });
  },

  async verifySignupCode(data: Pick<SignupVerificationData, 'email' | 'verification_code'>) {
    if (!data.verification_code) {
      throw new Error('请输入邮箱验证码');
    }

    const { error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.verification_code,
      type: 'signup',
    });

    if (error) {
      throw new Error(error.message || '验证码校验失败');
    }

    await supabase.auth.signOut();
    return apiSuccess(null, undefined, '邮箱验证成功，请使用邮箱和密码登录');
  },

  async login(data: LoginData) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(error.message || '登录失败');
    }

    const profile = await requireProfile();
    return apiSuccess({
      user: profile,
      accessToken: '',
      refreshToken: '',
    });
  },

  async refresh() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      throw new Error(error.message || '刷新登录状态失败');
    }

    return apiSuccess({
      session: data.session,
    });
  },

  async me() {
    const profile = await requireProfile();
    return apiSuccess(profile);
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const profile = await requireProfile();

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: oldPassword,
    });

    if (reauthError) {
      throw new Error('当前密码不正确');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message || '密码修改失败');
    }

    return apiSuccess(null, undefined, '密码已更新');
  },
};
