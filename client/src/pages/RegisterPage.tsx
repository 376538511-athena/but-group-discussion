import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, IdcardOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { getErrorMessage } from '../lib/errors';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await authApi.register({
        username: values.username,
        email: values.email,
        password: values.password,
        real_name: values.real_name,
        student_id: values.student_id,
        research_direction: values.research_direction,
      });
      setVerificationRequested(true);
      message.success('验证码已发送，请查收邮箱并完成验证');
    } catch (error) {
      message.error(getErrorMessage(error, '注册失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const values = await form.validateFields(['email', 'verification_code']);
    setVerifyLoading(true);
    try {
      await authApi.verifySignupCode({
        email: values.email,
        verification_code: values.verification_code,
      });
      message.success('邮箱验证成功，请登录');
      navigate('/login');
    } catch (error) {
      message.error(getErrorMessage(error, '验证码校验失败'));
    } finally {
      setVerifyLoading(false);
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
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 480,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#002147', marginBottom: 4 }}>
            注册新账号
          </Title>
          <Text type="secondary">加入组会文献讨论</Text>
        </div>

        <Form form={form} name="register" onFinish={onFinish} size="large" layout="vertical" autoComplete="off">
          <Form.Item
            name="real_name"
            label="姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="真实姓名" />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用于登录的用户名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="邮箱地址" />
          </Form.Item>

          {verificationRequested && (
            <>
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="验证码已发送"
                description="请去邮箱查看 6 位验证码，填写后再完成注册。若没收到，可重新点击下方“发送注册验证码”。"
              />
              <Form.Item
                name="verification_code"
                label="邮箱验证码"
                rules={[
                  { required: true, message: '请输入邮箱验证码' },
                  { len: 6, message: '验证码通常为 6 位' },
                ]}
              >
                <Input placeholder="输入邮箱收到的验证码" maxLength={6} />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="设置密码" />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="再次输入密码" />
          </Form.Item>

          <Form.Item name="student_id" label="学号">
            <Input prefix={<IdcardOutlined />} placeholder="学号（选填）" />
          </Form.Item>

          <Form.Item name="research_direction" label="研究方向">
            <Input placeholder="研究方向（选填）" />
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button type="primary" htmlType="submit" block loading={loading}>
                {verificationRequested ? '重新发送注册验证码' : '发送注册验证码'}
              </Button>
              {verificationRequested && (
                <Button block loading={verifyLoading} onClick={handleVerifyCode}>
                  验证验证码并完成注册
                </Button>
              )}
            </Space>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              已有账号？ <Link to="/login">立即登录</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;
