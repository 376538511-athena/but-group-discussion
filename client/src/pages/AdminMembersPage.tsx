import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Space, Typography, message, Popconfirm, Modal, Select } from 'antd';
import { TeamOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { usersApi } from '../api/users';
import type { User } from '../types/user';

const { Title } = Typography;

const AdminMembersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.data.data || []);
    } catch {
      message.error('获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await usersApi.updateStatus(userId, !currentStatus);
      message.success(currentStatus ? '已停用' : '已启用');
      fetchUsers();
    } catch {
      message.error('操作失败');
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await usersApi.updateRole(userId, role);
      message.success('角色已更新');
      fetchUsers();
    } catch {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'real_name', key: 'real_name' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '学号', dataIndex: 'student_id', key: 'student_id' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '研究方向', dataIndex: 'research_direction', key: 'research_direction' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: User) => (
        <Select
          value={role}
          size="small"
          style={{ width: 100 }}
          onChange={(val) => handleChangeRole(record.id, val)}
          options={[
            { value: 'member', label: '成员' },
            { value: 'admin', label: '管理员' },
          ]}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) =>
        active ? (
          <Tag color="success"><CheckCircleOutlined /> 活跃</Tag>
        ) : (
          <Tag color="default"><StopOutlined /> 已停用</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Popconfirm
          title={record.is_active ? '确定停用此成员？' : '确定启用此成员？'}
          onConfirm={() => handleToggleStatus(record.id, record.is_active)}
        >
          <Button
            type="link"
            danger={record.is_active}
            size="small"
          >
            {record.is_active ? '停用' : '启用'}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        <TeamOutlined style={{ marginRight: 8 }} />
        成员管理
      </Title>

      <Card>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
};

export default AdminMembersPage;
