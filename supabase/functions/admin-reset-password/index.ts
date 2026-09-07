import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ResetPasswordRequest {
  userId?: string;
  newPassword?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ success: false, message: 'Function environment is not configured' }, 500);
  }

  if (!authHeader) {
    return jsonResponse({ success: false, message: '请先登录' }, 401);
  }

  try {
    const { userId, newPassword } = (await req.json()) as ResetPasswordRequest;

    if (!userId || !newPassword) {
      return jsonResponse({ success: false, message: '缺少成员或新密码' }, 400);
    }

    if (newPassword.length < 8) {
      return jsonResponse({ success: false, message: '密码至少 8 位' }, 400);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ success: false, message: '登录状态无效' }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', caller.id)
      .single();

    if (callerProfileError || !callerProfile?.is_active || callerProfile.role !== 'admin') {
      return jsonResponse({ success: false, message: '只有管理员可以重置成员密码' }, 403);
    }

    if (caller.id === userId) {
      return jsonResponse({ success: false, message: '请在个人资料页修改自己的密码' }, 400);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('role, real_name')
      .eq('id', userId)
      .single();

    if (targetProfileError || !targetProfile) {
      return jsonResponse({ success: false, message: '成员不存在' }, 404);
    }

    if (targetProfile.role !== 'member') {
      return jsonResponse({ success: false, message: '只能重置普通成员的密码' }, 400);
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (resetError) {
      return jsonResponse({ success: false, message: resetError.message || '重置密码失败' }, 400);
    }

    return jsonResponse({
      success: true,
      message: '密码已重置',
      data: {
        userId,
        realName: targetProfile.real_name,
      },
    });
  } catch {
    return jsonResponse({ success: false, message: '重置密码失败，请稍后重试' }, 500);
  }
});
