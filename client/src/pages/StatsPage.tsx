import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Typography, Spin, Avatar, Space, Tag, Button, Popconfirm, message, Modal } from 'antd';
import {
  BarChartOutlined,
  FileTextOutlined,
  CommentOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { statsApi } from '../api/users';
import { weeklyTasksApi, type MemberAttendance } from '../api/weeklyTasks';

const { Title, Text } = Typography;

const StatsPage: React.FC = () => {
  const { user } = useAuth();
  const [participationData, setParticipationData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<MemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [participationRes, attendanceRes] = await Promise.all([
        statsApi.participation(),
        weeklyTasksApi.getAttendanceStats(),
      ]);
      setParticipationData(participationRes.data.data);
      setAttendanceData(attendanceRes.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWeeklyCheck = async () => {
    setCheckLoading(true);
    try {
      const res = await weeklyTasksApi.runWeeklyCheck();
      const { notified } = res.data.data;
      if (notified.length === 0) {
        message.success('检测完成，当前没有需要提醒的成员');
      } else {
        Modal.info({
          title: '本周任务检测完成',
          icon: <ExclamationCircleOutlined />,
          content: (
            <div>
              <p>以下成员已收到连续两周未完成任务的提醒：</p>
              <ul>
                {notified.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                账号不会自动停用，如需处理，请到“成员管理”页手动停用。
              </p>
            </div>
          ),
        });
      }
      fetchData();
    } catch {
      message.error('检测失败，请稍后重试');
    } finally {
      setCheckLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  // Build a lookup map from attendance data
  const attendanceMap = new Map<string, MemberAttendance>(
    attendanceData.map((a) => [a.user.id, a])
  );

  const statusTag = (status: MemberAttendance['current_week_status']) => {
    if (status === 'completed') return <Tag icon={<CheckCircleOutlined />} color="success">已完成</Tag>;
    if (status === 'on_leave') return <Tag icon={<CoffeeOutlined />} color="blue">已请假</Tag>;
    return <Tag icon={<ClockCircleOutlined />} color="warning">未完成</Tag>;
  };

  const columns = [
    {
      title: '姓名',
      key: 'name',
      render: (_: any, record: any) => (
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
      title: '本周任务',
      key: 'current_week',
      align: 'center' as const,
      render: (_: any, record: any) => {
        const att = attendanceMap.get(record.user.id);
        return att ? statusTag(att.current_week_status) : <Tag>未知</Tag>;
      },
    },
    {
      title: '两周连评数',
      key: 'consecutive',
      align: 'center' as const,
      render: (_: any, record: any) => {
        const att = attendanceMap.get(record.user.id);
        const n = att?.two_week_comments ?? 0;
        return (
          <Text strong style={{ color: n >= 2 ? '#002147' : '#999' }}>
            {n === 0 ? '0评' : `${n}条`}
          </Text>
        );
      },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BarChartOutlined style={{ marginRight: 8 }} />
          任务考勤
        </Title>
        {user?.role === 'admin' && (
          <Popconfirm
            title="本周任务检测"
            description="将向连续两周未完成任务且未请假的成员发送站内提醒，不会自动停用账号。确定执行吗？"
            onConfirm={handleWeeklyCheck}
            okText="确定执行"
            cancelText="取消"
          >
            <Button
              type="primary"
              danger
              loading={checkLoading}
              icon={<ExclamationCircleOutlined />}
            >
              本周任务检测
            </Button>
          </Popconfirm>
        )}
      </div>

      <Card>
        <Table
          dataSource={participationData?.summary || []}
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
