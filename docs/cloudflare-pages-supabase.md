# Cloudflare Pages + Supabase 部署说明

## 目标架构

- 前端部署到 Cloudflare Pages
- 用户认证使用 Supabase Auth
- 业务数据使用 Supabase Postgres
- PDF 文件使用 Supabase Storage

## Supabase 初始化

1. 在 Supabase 新建项目。
2. 在 SQL Editor 中执行 [supabase-schema.sql](/Users/athenazeng/Documents/New%20project/inspect_ai_site/ai组会论文网/docs/supabase-schema.sql)。
3. 在 Storage 中创建 bucket，名字默认用 `papers`。
4. 再创建一个头像 bucket，建议命名为 `avatars`。
5. 将需要的第一个管理员用户注册后，在 `profiles` 表中把该用户的 `role` 改成 `admin`。

## 现有项目增量调整

如果你的 Supabase 已经在跑，不想重建项目，只需要补下面这些：

1. 在 SQL Editor 里执行：

```sql
alter table public.papers add column if not exists journal_source text;
alter table public.profiles add column if not exists avatar_url text;
```

2. 在 `Storage > Policies` 里确认 `papers` bucket 至少有：
- `authenticated users can upload papers`
- `authenticated users can read papers`

3. 为 `avatars` bucket 新建两条 policy：
- 上传：`authenticated` + `INSERT` + `bucket_id = 'avatars'`
- 读取：`authenticated` + `SELECT` + `bucket_id = 'avatars'`

## 邮箱验证码注册

当前前端已经改成：

1. 先填写注册资料
2. 点击“发送注册验证码”
3. 去邮箱查看验证码
4. 输入验证码后完成注册

你在 Supabase 里需要同步打开：

1. `Authentication > Sign In / Providers > Email`
2. 打开 `Confirm email`

另外建议检查：

1. `Authentication > URL Configuration`
- `Site URL` 填你的 Cloudflare Pages 地址，后续换成正式域名后再改成正式域名

2. `Authentication > Email`
- 测试阶段可先用默认邮件能力
- 正式使用建议换成你自己的 SMTP

说明：
- 当前实现基于 Supabase 的邮箱确认能力
- 前端会要求用户输入邮箱验证码后再完成注册
- 如果你想让邮件模板更明确显示验证码，建议在 Supabase Email 模板里确认 OTP token 变量已启用

## 前端环境变量

在 Cloudflare Pages 项目里配置下面四个环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`
- `VITE_SUPABASE_AVATAR_BUCKET`

本地开发可参考 [client/.env.example](/Users/athenazeng/Documents/New%20project/inspect_ai_site/ai组会论文网/client/.env.example)。

## Cloudflare Pages 构建配置

- Framework preset: `Vite`
- Root directory: `client`
- Build command: `npm run build`
- Build output directory: `dist`

## 注意事项

- 当前登录方式已经切换为“邮箱 + 密码”。
- 注册流程已扩展为邮箱验证码确认。
- 文件上传不再使用本地 `uploads` 目录，而是写入 Supabase Storage。
- 头像上传建议使用单独的 `avatars` bucket，并限制 2MB 内。
- 文献删除按钮只对自己上传的文献显示。
- 参与统计页已经简化成姓名、上传文献数、评论文献数三列。
- 安全性依赖 Supabase RLS，部署前请不要跳过 SQL 脚本。

## 自定义域名

如果你要把现在的 `*.pages.dev` 换成自己的域名：

1. 打开 Cloudflare Pages 项目
2. 进入 `Custom domains`
3. 点击 `Set up a custom domain`
4. 输入你的正式域名，比如 `paper.xxx.com`
5. 按 Cloudflare 提示完成 DNS 绑定

域名切换完成后，记得回 Supabase 的 `Authentication > URL Configuration`，把 `Site URL` 一起改成新域名。
