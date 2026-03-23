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
4. 将需要的第一个管理员用户注册后，在 `profiles` 表中把该用户的 `role` 改成 `admin`。

## 前端环境变量

在 Cloudflare Pages 项目里配置下面三个环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_STORAGE_BUCKET`

本地开发可参考 [client/.env.example](/Users/athenazeng/Documents/New%20project/inspect_ai_site/ai组会论文网/client/.env.example)。

## Cloudflare Pages 构建配置

- Framework preset: `Vite`
- Root directory: `client`
- Build command: `npm run build`
- Build output directory: `dist`

## 注意事项

- 当前登录方式已经切换为“邮箱 + 密码”。
- 文件上传不再使用本地 `uploads` 目录，而是写入 Supabase Storage。
- 安全性依赖 Supabase RLS，部署前请不要跳过 SQL 脚本。
