import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, List, Tag, Typography, Spin, Empty } from 'antd';
import {
  FileTextOutlined,
  CommentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../api/users';
import { papersApi } from '../api/papers';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [pendingPapers, setPendingPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, papersRes] = await Promise.all([
          statsApi.overview(),
          papersApi.list({ limit: 50 }),
        ]);
        setStats(statsRes.data.data);

        // Filter papers where user hasn't commented and isn't the uploader
        const papers = papersRes.data.data || [];
        const pending = papers.filter(
          (p: any) => !p.user_has_commented && !p.is_uploader
        );
        setPendingPapers(pending);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        欢迎回来，{user?.real_name}
      </Title>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总文献数"
              value={stats?.total_papers || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#002147' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="我的评论"
              value={stats?.my_comments || 0}
              prefix={<CommentOutlined />}
              valueStyle={{ color: '#002147' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="待评论"
              value={stats?.pending_count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: stats?.pending_count > 0 ? '#f5222d' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="组会成员"
              value={stats?.total_members || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#002147' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Pending Papers */}
      <Card
        title={
          <span>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            待评论文献
            {pendingPapers.length > 0 && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                {pendingPapers.length}
              </Tag>
            )}
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        {pendingPapers.length === 0 ? (
          <Empty description="所有文献已完成评论" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={pendingPapers.slice(0, 10)}
            renderItem={(paper: any) => (
              <List.Item
                key={paper.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/papers/${paper.id}`)}
                extra={
                  <Tag color="red">待完成 Pending</Tag>
                }
              >
                <List.Item.Meta
                  title={
                    <Text
                      style={{ color: '#002147', fontSize: 15 }}
                      ellipsis
                    >
                      {paper.title}
                    </Text>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ color: '#2e7d32', fontSize: 13 }}>
                        {paper.authors}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        上传者: {paper.uploader?.real_name} | {dayjs(paper.created_at).format('YYYY-MM-DD')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
