import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Spin, Tooltip } from 'antd';
import { BarChartOutlined, CheckCircleOutlined, CloseCircleOutlined, MinusOutlined } from '@ant-design/icons';
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
      fixed: 'left' as const,
      width: 120,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...data.papers.map((paper: any) => ({
      title: (
        <Tooltip title={paper.title}>
          <Text ellipsis style={{ maxWidth: 80, display: 'block', fontSize: 12 }}>
            {paper.title}
          </Text>
        </Tooltip>
      ),
      key: `paper-${paper.id}`,
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const paperData = record.papers.find((p: any) => p.paper_id === paper.id);
        if (!paperData) return <MinusOutlined style={{ color: '#d9d9d9' }} />;
        if (paperData.is_uploader) {
          return <Tag color="blue" style={{ fontSize: 11 }}>上传者</Tag>;
        }
        return paperData.has_commented ? (
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 16 }} />
        );
      },
    })),
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <BarChartOutlined style={{ marginRight: 8 }} />
        参与统计
      </Title>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Tag color="success"><CheckCircleOutlined /> 已评论</Tag>
          <Tag color="error"><CloseCircleOutlined /> 未评论</Tag>
          <Tag color="blue">上传者（免评）</Tag>
        </div>

        <Table
          dataSource={data.matrix}
          columns={columns}
          rowKey={(record: any) => record.user.id}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
          size="small"
        />
      </Card>
    </div>
  );
};

export default StatsPage;
