import React, { useEffect, useState } from 'react';
import { Card, Typography, Tag, List, Spin, Empty } from 'antd';
import {
  CheckSquareOutlined, CheckCircleFilled, ClockCircleFilled,
  CalendarOutlined, FileTextOutlined, CommentOutlined, CoffeeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weeklyTasksApi, type WeeklyTaskSummary } from '../api/weeklyTasks';
import { supabase } from '../lib/supabase';
import { getCurrentWeekWindow } from '../lib/weekCycle';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<WeeklyTaskSummary | null>(null);
  const [myCommentCount, setMyCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes] = await Promise.all([
          weeklyTasksApi.getCurrentWeekSummary(),
        ]);
        setSummary(summaryRes.data.data);

        // Count comments by current user on papers uploaded this week
        const { start, end } = getCurrentWeekWindow();
        if (user && summaryRes.data.data.papers.length > 0) {
          const paperIds = summaryRes.data.data.papers.map((p) => p.id);
          const { count } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('paper_id', paperIds);
          setMyCommentCount(count || 0);
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  const myStatus = summary?.members.find((m) => m.user.id === user?.id);

  // Papers user has NOT yet commented on
  const pendingPapers = summary?.papers.filter((p) => {
    // uploader is always done
    if (p.uploader_id === user?.id) return false;
    // check if user commented — approximate from myStatus
    return myStatus && !myStatus.completed;
  }) ?? [];

  const totalPapers = summary?.papers.length ?? 0;
  const pendingCount = myStatus?.is_uploader
    ? 0
    : myStatus?.completed
    ? 0
    : totalPapers;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CheckSquareOutlined style={{ marginRight: 8 }} />
          本周任务
        </Title>
        {summary && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            周期：{summary.week_start} ～ {summary.week_end}
          </Text>
        )}
      </div>

      {/* Personal status banner */}
      {myStatus && (
        <Card
          style={{
            marginBottom: 16,
            border: myStatus.completed ? '1px solid #52c41a' : '1px solid #faad14',
            background: myStatus.completed ? '#f6ffed' : '#fffbe6',
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {myStatus.completed
              ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 24 }} />
              : <ClockCircleFilled style={{ color: '#faad14', fontSize: 24 }} />}
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {myStatus.on_leave
                  ? '本周长期请假，任务豁免 ☕'
                  : myStatus.is_uploader
                  ? '本周已上传文献，任务完成 🎉'
                  : myStatus.completed
                  ? '本周任务已完成 🎉'
                  : '本周任务未完成，请尽快评论'}
              </Text>
              {myStatus.on_leave && (
                <div>
                  <Tag icon={<CoffeeOutlined />} color="blue" style={{ marginTop: 4 }}>长期请假中</Tag>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card bodyStyle={{ padding: '20px 24px' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <FileTextOutlined style={{ marginRight: 6 }} />
            待阅读文献数
          </Text>
          <div style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 36, fontWeight: 700, color: pendingCount > 0 ? '#f5222d' : '#52c41a' }}>
              {pendingCount}
            </Text>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>篇</Text>
          </div>
        </Card>
        <Card bodyStyle={{ padding: '20px 24px' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <CommentOutlined style={{ marginRight: 6 }} />
            本周贡献评论数
          </Text>
          <div style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 36, fontWeight: 700, color: '#002147' }}>
              {myCommentCount}
            </Text>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>条</Text>
          </div>
        </Card>
      </div>

      {/* This week's papers */}
      <Card
        title={
          <span>
            <FileTextOutlined style={{ marginRight: 8 }} />
            本周文献（共 {totalPapers} 篇）
          </span>
        }
      >
        {!summary || summary.papers.length === 0 ? (
          <Empty description="本周暂无文献" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={summary.papers}
            renderItem={(paper) => (
              <List.Item
                key={paper.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/papers/${paper.id}`)}
              >
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 20, color: '#002147', marginTop: 2 }} />}
                  title={<Text style={{ color: '#1a0dab' }}>{paper.title}</Text>}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      上传者：{(paper.uploader as any)?.real_name ?? '未知'} ·{' '}
                      {dayjs(paper.created_at).format('MM-DD HH:mm')}
                    </Text>
                  }
                />
                {paper.uploader_id === user?.id && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>我上传的</Tag>
                )}
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
