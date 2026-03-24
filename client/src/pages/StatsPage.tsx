import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Spin, Avatar, Space } from 'antd';
import { BarChartOutlined, FileTextOutlined, CommentOutlined, UserOutlined } from '@ant-design/icons';
import { statsApi } from '../api/users';

const { Title, Text } = Typography;

const StatsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await statsApi.participation();
        setData(res.data.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!data) return null;

  const columns = [
    {
      title: '姓名',
      dataIndex: ['user', 'real_name'],
      key: 'name',
      render: (_: string, record: any) => (
        <Space>
          <Avatar size={36} src={record.user.avatar_url} icon={<UserOutlined />} />
          <div>
            <Text strong>{record.user.real_name}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                @{record.user.username}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '上传文献数',
      dataIndex: 'uploaded_count',
      key: 'uploaded_count',
      align: 'center' as const,
      render: (value: number) => (
        <Space>
          <FileTextOutlined style={{ color: '#002147' }} />
          <Text strong>{value}</Text>
        </Space>
      ),
    },
    {
      title: '评论文献数',
      dataIndex: 'commented_count',
      key: 'commented_count',
      align: 'center' as const,
      render: (value: number) => (
        <Space>
          <CommentOutlined style={{ color: '#2e7d32' }} />
          <Text strong>{value}</Text>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        参与统计
      </Title>

      <Card>
        <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
          这是新的简化版参与统计 demo。后续文献再多，页面也只保留每位成员的核心贡献数据，不再按每篇文章展开矩阵。
        </Text>

        <Table
          dataSource={data.summary}
          columns={columns}
          rowKey={(record: any) => record.user.id}
          pagination={false}
          bordered
          size="middle"
        />
      </Card>
    </div>
  );
};

export default StatsPage;
