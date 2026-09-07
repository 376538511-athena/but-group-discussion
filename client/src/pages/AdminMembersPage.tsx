import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Tag, Typography, message, Popconfirm, Select, Space, Modal, Form, Input } from 'antd';
import { TeamOutlined, CheckCircleOutlined, StopOutlined, UserOutlined, KeyOutlined, SearchOutlined } from '@ant-design/icons';
import { usersApi } from '../api/users';
import type { User } from '../types/user';

const { Title, Text } = Typography;

interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

const AdminMembersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [resetPasswordForm] = Form.useForm<ResetPasswordFormValues>();

  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return users;
    }

    return users.filter((user) => {
      return [user.real_name, user.username]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [users, searchKeyword]);

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

  const openResetPasswordModal = (user: User) => {
    setResettingUser(user);
    resetPasswordForm.resetFields();
    setResetPasswordModalOpen(true);
  };

  const closeResetPasswordModal = () => {
    setResetPasswordModalOpen(false);
    setResettingUser(null);
    resetPasswordForm.resetFields();
  };

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    if (!resettingUser) return;

    setResetPasswordLoading(true);
    try {
      await usersApi.resetPassword(resettingUser.id, values.newPassword);
      message.success(`已重置 ${resettingUser.real_name} 的密码`);
      closeResetPasswordModal();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重置密码失败');
    } finally {
      setResetPasswordLoading(false);
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
        <Space size={4}>
          {record.role === 'member' && (
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => openResetPasswordModal(record)}
            >
              重置密码
            </Button>
          )}
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
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          成员管理
        </Title>
        <Space size={24} align="center">
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
            placeholder="搜索姓名/账号"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            style={{ width: 260 }}
          />
          <Space size={6} align="center">
            <UserOutlined style={{ color: '#8c8c8c' }} />
            <Text type="secondary">当前注册人数</Text>
            <Text strong style={{ fontSize: 24, color: '#002147', lineHeight: 1 }}>
              {users.length}
            </Text>
          </Space>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 位成员` }}
        />
      </Card>

      <Modal
        title={resettingUser ? `重置 ${resettingUser.real_name} 的密码` : '重置成员密码'}
        open={resetPasswordModalOpen}
        onCancel={closeResetPasswordModal}
        onOk={() => resetPasswordForm.submit()}
        confirmLoading={resetPasswordLoading}
        okText="确认重置"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPassword}
          preserve={false}
        >
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password placeholder="请输入至少 8 位的新密码" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminMembersPage;
