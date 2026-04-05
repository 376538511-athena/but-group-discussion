-- =============================================================
-- OurBUT 模拟数据
-- 运行顺序：先跑 supabase-schema.sql + migration-v2.sql + migration-v3.sql
-- 再在 Supabase SQL Editor 执行此文件
-- 注意：auth.users 的插入需要 service_role，普通 SQL Editor 已有权限
-- =============================================================

-- ── 1. 创建模拟成员（auth.users + profiles）───────────────────────────────────
-- 注意：handle_new_user trigger 会自动从 raw_user_meta_data 填充 profiles

DO $$
DECLARE
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid();
  u4 uuid := gen_random_uuid();
  u5 uuid := gen_random_uuid();
  u6 uuid := gen_random_uuid();
BEGIN

  -- Insert into auth.users (bypasses trigger via direct insert)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
    aud, role, raw_user_meta_data, created_at, updated_at)
  VALUES
    (u1, '00000000-0000-0000-0000-000000000000',
     'zhangwei@example.com', crypt('Test1234!', gen_salt('bf')), now(),
     'authenticated', 'authenticated',
     '{"username":"zhangwei","real_name":"张威","student_id":"2021001","college":"计算机学院 计算机科学与技术","research_direction":"自然语言处理"}'::jsonb,
     now(), now()),

    (u2, '00000000-0000-0000-0000-000000000000',
     'liuna@example.com', crypt('Test1234!', gen_salt('bf')), now(),
     'authenticated', 'authenticated',
     '{"username":"liuna","real_name":"刘娜","student_id":"2021002","college":"计算机学院 人工智能","research_direction":"计算机视觉"}'::jsonb,
     now(), now()),

    (u3, '00000000-0000-0000-0000-000000000000',
     'wangfang@example.com', crypt('Test1234!', gen_salt('bf')), now(),
     'authenticated', 'authenticated',
     '{"username":"wangfang","real_name":"王芳","student_id":"2021003","college":"信息管理学院 信息系统","research_direction":"知识图谱"}'::jsonb,
     now(), now()),

    (u4, '00000000-0000-0000-0000-000000000000',
     'chenlong@example.com', crypt('Test1234!', gen_salt('bf')), now(),
     'authenticated', 'authenticated',
     '{"username":"chenlong","real_name":"陈龙","student_id":"2022001","college":"计算机学院 计算机科学与技术","research_direction":"推荐系统"}'::jsonb,
     now(), now()),

    (u5, '00000000-0000-0000-0000-000000000000',
     'sunyue@example.com', crypt('Test1234!', gen_salt('bf')), now(),
     'authenticated', 'authenticated',
     '{"username":"sunyue","real_name":"孙悦","student_id":"2022002","college":"统计学院 数据科学","research_direction":"图神经网络"}'::jsonb,
     now(), now()),

    (u6, '00000000-0000-0000-0000-000000000000',
     'liuyang@example.com', crypt('Test1234!', gen_salt('bf')), now(),
     'authenticated', 'authenticated',
     '{"username":"liuyang","real_name":"刘阳","student_id":"2022003","college":"计算机学院 软件工程","research_direction":"大模型微调"}'::jsonb,
     now(), now());

  -- Insert profiles (trigger may already do this, but explicit upsert for safety)
  INSERT INTO public.profiles (id, username, email, real_name, student_id, college, research_direction, role, is_active)
  VALUES
    (u1, 'zhangwei',  'zhangwei@example.com',  '张威', '2021001', '计算机学院 计算机科学与技术', '自然语言处理', 'member', true),
    (u2, 'liuna',     'liuna@example.com',      '刘娜', '2021002', '计算机学院 人工智能',         '计算机视觉',   'member', true),
    (u3, 'wangfang',  'wangfang@example.com',   '王芳', '2021003', '信息管理学院 信息系统',       '知识图谱',     'member', true),
    (u4, 'chenlong',  'chenlong@example.com',   '陈龙', '2022001', '计算机学院 计算机科学与技术', '推荐系统',     'member', true),
    (u5, 'sunyue',    'sunyue@example.com',     '孙悦', '2022002', '统计学院 数据科学',           '图神经网络',   'member', true),
    (u6, 'liuyang',   'liuyang@example.com',    '刘阳', '2022003', '计算机学院 软件工程',         '大模型微调',   'member', true)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    real_name = EXCLUDED.real_name,
    student_id = EXCLUDED.student_id,
    college = EXCLUDED.college,
    research_direction = EXCLUDED.research_direction;

  -- ── 2. 模拟文献（papers）───────────────────────────────────────────────────
  -- 本周文献（周四 ~ 今天）
  INSERT INTO public.papers (title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date)
  VALUES
    ('Attention Is All You Need',
     'Vaswani et al.',
     'NeurIPS 2017',
     '提出了Transformer架构，完全基于注意力机制，无需循环和卷积，在机器翻译等任务上取得SOTA效果。',
     u1 || '/mock-attention.pdf', 1024000, 'attention.pdf', u1,
     current_date),

    ('BERT: Pre-training of Deep Bidirectional Transformers',
     'Devlin et al.',
     'NAACL 2019',
     '提出BERT预训练模型，通过双向Transformer在大规模语料上预训练，在11项NLP任务上取得SOTA。',
     u2 || '/mock-bert.pdf', 2048000, 'bert.pdf', u2,
     current_date - interval '1 day');

  -- 上周文献
  INSERT INTO public.papers (title, authors, journal_source, abstract, file_path, file_size, original_filename, uploader_id, presentation_date, created_at)
  VALUES
    ('GPT-3: Language Models are Few-Shot Learners',
     'Brown et al.',
     'NeurIPS 2020',
     'GPT-3拥有1750亿参数，通过few-shot prompting在多任务上展现出强大能力，无需微调。',
     u3 || '/mock-gpt3.pdf', 3072000, 'gpt3.pdf', u3,
     current_date - interval '8 days',
     now() - interval '8 days'),

    ('LoRA: Low-Rank Adaptation of Large Language Models',
     'Hu et al.',
     'ICLR 2022',
     '提出LoRA方法，通过低秩矩阵分解对大模型进行高效微调，仅训练少量参数即可达到全参数微调效果。',
     u6 || '/mock-lora.pdf', 1536000, 'lora.pdf', u6,
     current_date - interval '9 days',
     now() - interval '9 days');

  -- ── 3. 模拟评论（comments）──────────────────────────────────────────────────
  -- 对本周第一篇文献的评论
  WITH p AS (SELECT id FROM public.papers WHERE title = 'Attention Is All You Need' LIMIT 1)
  INSERT INTO public.comments (paper_id, user_id, content, is_featured)
  SELECT p.id, u2, '这篇文章开创了Transformer时代，多头注意力机制的设计非常精妙，位置编码的选择也值得深入思考。整体架构简洁优雅，是NLP领域的里程碑之作。', true FROM p
  UNION ALL
  SELECT p.id, u3, '注意力机制的复杂度是O(n²)，这在长序列处理时会成为瓶颈。后续工作如Longformer、BigBird都是在尝试解决这个问题。', false FROM p
  UNION ALL
  SELECT p.id, u4, 'Encoder-Decoder结构对翻译任务非常合适，但我觉得最令人印象深刻的是Self-Attention的并行化优势，大幅提升了训练效率。', false FROM p
  UNION ALL
  SELECT p.id, u6, '文章对Scale的处理很有启发性，模型深度和宽度的选择背后有很深的工程考量。', false FROM p;

  -- 对本周第二篇文献的评论
  WITH p AS (SELECT id FROM public.papers WHERE title LIKE 'BERT%' LIMIT 1)
  INSERT INTO public.comments (paper_id, user_id, content)
  SELECT p.id, u1, 'MLM和NSP两个预训练任务的设计非常巧妙，特别是MLM让模型学到了双向上下文表示，这比GPT的单向语言模型有明显优势。' FROM p
  UNION ALL
  SELECT p.id, u4, '在下游任务上fine-tune只需要调整少量参数，工程实用性很强。BERT的出现真正推动了NLP的工业化落地。' FROM p
  UNION ALL
  SELECT p.id, u5, '有意思的是后来发现NSP任务其实效果一般，RoBERTa去掉NSP后效果反而更好，说明预训练任务的设计还有很大探索空间。' FROM p;

  -- 对上周文献的评论（历史数据）
  WITH p AS (SELECT id FROM public.papers WHERE title LIKE 'GPT-3%' LIMIT 1)
  INSERT INTO public.comments (paper_id, user_id, content, created_at, updated_at)
  SELECT p.id, u1, 'Few-shot prompting的思路非常新颖，1750B参数量也让人叹为观止。但推理成本极高，工业落地需要大量工程优化。',
         now() - interval '7 days', now() - interval '7 days' FROM p
  UNION ALL
  SELECT p.id, u2, '涌现能力（emergent ability）是这篇文章最有趣的发现，当规模达到某个阈值后性能突然大幅跃升，这对理解大模型很有启发。',
         now() - interval '7 days', now() - interval '7 days' FROM p
  UNION ALL
  SELECT p.id, u3, '上下文学习（ICL）机制至今仍是研究热点，为什么大模型能从几个例子中快速适应新任务，理论解释还不完善。',
         now() - interval '6 days', now() - interval '6 days' FROM p
  UNION ALL
  SELECT p.id, u5, '这篇文章也引发了大模型的伦理讨论，生成内容的真实性和偏见问题需要认真对待。',
         now() - interval '6 days', now() - interval '6 days' FROM p;

  -- ── 4. 模拟点赞（comment_likes）──────────────────────────────────────────────
  WITH c AS (
    SELECT id FROM public.comments
    WHERE content LIKE '%Transformer时代%' LIMIT 1
  )
  INSERT INTO public.comment_likes (comment_id, user_id)
  SELECT c.id, u3 FROM c
  UNION ALL SELECT c.id, u4 FROM c
  UNION ALL SELECT c.id, u5 FROM c
  UNION ALL SELECT c.id, u6 FROM c;

  WITH c AS (
    SELECT id FROM public.comments
    WHERE content LIKE '%双向上下文%' LIMIT 1
  )
  INSERT INTO public.comment_likes (comment_id, user_id)
  SELECT c.id, u2 FROM c
  UNION ALL SELECT c.id, u3 FROM c;

  -- ── 5. 模拟请假（leave_requests）─────────────────────────────────────────────
  -- 孙悦长期请假（已审批通过）
  INSERT INTO public.leave_requests (user_id, week_start, start_time, end_time, leave_type, reason, status)
  VALUES (u5,
    date_trunc('week', now() + interval '3 days')::date - interval '3 days',
    now() - interval '3 days',
    now() + interval '10 days',
    'long_term',
    '参加学术会议 EMNLP 2024，需长期出差无法正常参与组会。',
    'approved');

  -- 陈龙短期请假（待审批）
  INSERT INTO public.leave_requests (user_id, week_start, start_time, end_time, leave_type, reason, status)
  VALUES (u4,
    date_trunc('week', now() + interval '3 days')::date - interval '3 days',
    now() + interval '1 day',
    now() + interval '2 days',
    'short_term',
    '家里有事，需要请假一天，不影响本周任务完成。',
    'pending');

  -- ── 6. 模拟通知（notifications）──────────────────────────────────────────────
  -- 请假申请通知给管理员（由陈龙请假触发，这里手动补充）
  -- 注意：实际场景中提交请假时会自动发送，此处为初始模拟数据
  INSERT INTO public.notifications (user_id, title, content, type, is_read)
  SELECT id,
    '请假申请：陈龙',
    '陈龙 申请短期假（' || to_char(now() + interval '1 day', 'YYYY-MM-DD') || ' ~ ' ||
      to_char(now() + interval '2 days', 'YYYY-MM-DD') || '），原因：家里有事，需要请假一天，不影响本周任务完成。',
    'leave_request',
    false
  FROM public.profiles WHERE role = 'admin';

  -- 孙悦收到审批通过通知
  INSERT INTO public.notifications (user_id, title, content, type, is_read)
  VALUES (u5, '请假申请已通过', '您的请假申请已通过，请假期间任务自动豁免。', 'approval', true);

  RAISE NOTICE '模拟数据写入完成 ✓';
END$$;
