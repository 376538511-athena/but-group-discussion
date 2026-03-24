import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Divider, Avatar, Upload, Space } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../lib/errors';

const { Title, Text } = Typography;

const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        real_name: user.real_name,
        email: user.email,
        student_id: user.student_id,
        research_direction: user.research_direction,
      });
    }
  }, [user, form]);

  const handleUpdate = async (values: any) => {
    if (!user) return;
    setLoading(true);
    try {
      await usersApi.update(user.id, values);
      await refreshUser();
      message.success('资料已更新');
    } catch (error) {
      message.error(getErrorMessage(error, '更新失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    setPwdLoading(true);
    try {
      await authApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码已更新');
      pwdForm.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, '修改失败'));
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return Upload.LIST_IGNORE;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('头像大小不能超过 2MB');
      return Upload.LIST_IGNORE;
    }

    setAvatarLoading(true);
    try {
      await usersApi.uploadAvatar(file);
      await refreshUser();
      message.success('头像已更新');
    } catch (error) {
      message.error(getErrorMessage(error, '头像上传失败'));
    } finally {
      setAvatarLoading(false);
    }

    return Upload.LIST_IGNORE;
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        个人资料
      </Title>

      <Card style={{ marginBottom: 24 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          用户名: {user?.username} | 角色: {user?.role === 'admin' ? '管理员' : '成员'}
        </Text>

        <div style={{ marginBottom: 24 }}>
          <Space align="center" size="large">
            <Avatar size={72} src={user?.avatar_url} icon={<UserOutlined />} />
            <Upload showUploadList={false} beforeUpload={handleAvatarUpload} accept="image/*">
              <Button icon={<UploadOutlined />} loading={avatarLoading}>
                上传头像
              </Button>
            </Upload>
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            建议使用方形图片，大小不超过 2MB。
          </Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="real_name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="student_id" label="学号">
            <Input />
          </Form.Item>
          <Form.Item name="research_direction" label="研究方向">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="修改密码">
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true },
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
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={pwdLoading}>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ProfilePage;
