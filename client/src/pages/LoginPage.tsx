import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/errors';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      message.error(getErrorMessage(error, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #002147 0%, #003d7a 50%, #0056a8 100%)',
      }}
    >
      <Card
        style={{
          width: 420,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ color: '#002147', marginBottom: 4 }}>
            OurBUT
          </Title>
          <Text type="secondary">Seminar Paper Discussion</Text>
        </div>

        <Form name="login" onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="邮箱" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              还没有账号？ <Link to="/register">立即注册</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
