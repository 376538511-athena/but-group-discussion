import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Form, Input, Button, Typography, message, Avatar, Upload, Space,
  Tabs, List, Tag, Empty, Select, Popconfirm, Modal, DatePicker,
} from 'antd';
import {
  UserOutlined, UploadOutlined, FileTextOutlined, SaveOutlined,
  CalendarOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users';
import { authApi } from '../api/auth';
import { papersApi } from '../api/papers';
import { bookmarksApi } from '../api/bookmarks';
import { leaveRequestsApi } from '../api/leaveRequests';
import { getErrorMessage } from '../lib/errors';
import dayjs from 'dayjs';
import type { Paper } from '../types/paper';
import type { LeaveRequest } from '../types/leaveRequest';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Basic Info Tab ──────────────────────────────────────────────────────────
const BasicInfoTab: React.FC = () => {
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
        college: user.college,
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
    if (!file.type.startsWith('image/')) { message.error('只能上传图片文件'); return Upload.LIST_IGNORE; }
    if (file.size / 1024 / 1024 >= 2) { message.error('头像大小不能超过 2MB'); return Upload.LIST_IGNORE; }
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
    <>
      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          用户名: {user?.username} | 角色: {user?.role === 'admin' ? '管理员' : '成员'}
        </Text>
        <Space align="center" size="large" style={{ marginBottom: 16 }}>
          <Avatar size={72} src={user?.avatar_url} icon={<UserOutlined />} />
          <Upload showUploadList={false} beforeUpload={handleAvatarUpload} accept="image/*">
            <Button icon={<UploadOutlined />} loading={avatarLoading}>上传头像</Button>
          </Upload>
        </Space>
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
          <Form.Item name="college" label="学院专业">
            <Input placeholder="例：计算机学院 计算机科学与技术" />
          </Form.Item>
          <Form.Item name="research_direction" label="研究方向">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>保存修改</Button>
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
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('两次密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={pwdLoading}>修改密码</Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
};

// ─── My Papers Tab ─────────────────────────────────────────────────────────────
const MyPapersTab: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    papersApi
      .list({ limit: 100 })
      .then((res) => {
        setPapers((res.data.data || []).filter((p: Paper) => p.uploader_id === user?.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <Card loading={loading}>
      {papers.length === 0 ? (
        <Empty description="还没有上传过文献" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={papers}
          renderItem={(paper) => (
            <List.Item key={paper.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/papers/${paper.id}`)}>
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: 20, color: '#002147' }} />}
                title={<Text style={{ color: '#1a0dab' }}>{paper.title}</Text>}
                description={
                  <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{paper.authors}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(paper.created_at).format('YYYY-MM-DD')}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

// ─── Bookmarks Tab ─────────────────────────────────────────────────────────────
const BookmarksTab: React.FC = () => {
  const navigate = useNavigate();
  const [paperBookmarks, setPaperBookmarks] = useState<Paper[]>([]);
  const [commentBookmarks, setCommentBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    try {
      const [paperRes, commentRes] = await Promise.all([
        bookmarksApi.listPaperBookmarks(),
        bookmarksApi.listCommentBookmarks(),
      ]);
      setPaperBookmarks(paperRes.data.data || []);
      setCommentBookmarks(commentRes.data.data || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const handleRemovePaper = async (paperId: number) => {
    await bookmarksApi.togglePaperBookmark(paperId);
    setPaperBookmarks((prev) => prev.filter((p) => p.id !== paperId));
  };

  const handleRemoveComment = async (commentId: number) => {
    await bookmarksApi.toggleCommentBookmark(commentId);
    setCommentBookmarks((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title={<><FileTextOutlined style={{ marginRight: 8 }} />收藏文献</>} loading={loading}>
        {paperBookmarks.length === 0 ? (
          <Empty description="还没有收藏文献" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={paperBookmarks}
            renderItem={(paper) => (
              <List.Item
                key={paper.id}
                extra={
                  <Popconfirm title="取消收藏？" onConfirm={() => handleRemovePaper(paper.id)}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                }
              >
                <List.Item.Meta
                  title={
                    <Text style={{ color: '#1a0dab', cursor: 'pointer' }} onClick={() => navigate(`/papers/${paper.id}`)}>
                      {paper.title}
                    </Text>
                  }
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{paper.authors}</Text>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title={<><SaveOutlined style={{ marginRight: 8 }} />收藏评论</>} loading={loading}>
        {commentBookmarks.length === 0 ? (
          <Empty description="还没有收藏评论" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={commentBookmarks}
            renderItem={(item: any) => (
              <List.Item
                key={item.id}
                extra={
                  <Popconfirm title="取消收藏？" onConfirm={() => handleRemoveComment(item.id)}>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                  </Popconfirm>
                }
              >
                <List.Item.Meta
                  title={
                    <Text style={{ color: '#1a0dab', cursor: 'pointer', fontSize: 12 }} onClick={() => navigate(`/papers/${item.paper_id}`)}>
                      来自：{item.paper?.title || `文献 #${item.paper_id}`}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {item.content?.slice(0, 120)}{(item.content?.length ?? 0) > 120 ? '...' : ''}
                    </Text>
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

// ─── Leave Request Tab ─────────────────────────────────────────────────────────
const leaveTypeLabel = (t: string) => t === 'long_term' ? '长期假' : '短期假';
const statusTag = (status: LeaveRequest['status']) => {
  if (status === 'approved') return <Tag color="success">请假已通过</Tag>;
  if (status === 'rejected') return <Tag color="error">已驳回</Tag>;
  return <Tag color="default">待老师审批</Tag>;
};

const LeaveTab: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchRequests = useCallback(async () => {
    try {
      const res = await leaveRequestsApi.listMine();
      setRequests(res.data.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const [start, end] = values.timeRange;
      await leaveRequestsApi.create({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        leave_type: values.leave_type,
        reason: values.reason,
      });
      message.success('请假申请已提交，等待老师审批');
      form.resetFields();
      setModalOpen(false);
      fetchRequests();
    } catch (error) {
      message.error(getErrorMessage(error, '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await leaveRequestsApi.deleteOwn(id);
      message.success('已撤销请假申请');
      fetchRequests();
    } catch (error) {
      message.error(getErrorMessage(error, '撤销失败'));
    }
  };

  return (
    <>
      <Card
        loading={loading}
        extra={
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => setModalOpen(true)}>
            申请请假
          </Button>
        }
      >
        {requests.length === 0 ? (
          <Empty description="暂无请假记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={requests}
            renderItem={(req) => (
              <List.Item
                key={req.id}
                extra={
                  <Space direction="vertical" align="end" size={4}>
                    {statusTag(req.status)}
                    {req.status === 'pending' && (
                      <Popconfirm title="确定撤销该请假申请？" onConfirm={() => handleRevoke(req.id)}>
                        <Button type="link" size="small" danger>撤销</Button>
                      </Popconfirm>
                    )}
                  </Space>
                }
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>
                        {req.start_time
                          ? `${dayjs(req.start_time).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(req.end_time!).format('YYYY-MM-DD HH:mm')}`
                          : '时间未设置'}
                      </Text>
                      <Tag color={req.leave_type === 'long_term' ? 'red' : 'orange'}>
                        {leaveTypeLabel(req.leave_type)}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary">原因：{req.reason}</Text>
                      {req.admin_note && (
                        <div><Text type="secondary" style={{ fontSize: 12 }}>老师备注：{req.admin_note}</Text></div>
                      )}
                      {req.leave_type === 'short_term' && (
                        <div><Text type="warning" style={{ fontSize: 12 }}>短期假需正常参加本周任务</Text></div>
                      )}
                      <div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          申请时间：{dayjs(req.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title="申请请假"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="timeRange"
            label="请假时间"
            rules={[{ required: true, message: '请选择请假时间范围' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>
          <Form.Item
            name="leave_type"
            label="请假类型"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'short_term', label: '短期假（需参加本周任务）' },
                { value: 'long_term', label: '长期假（豁免周任务）' },
              ]}
              placeholder="选择请假类型"
            />
          </Form.Item>
          <Form.Item name="reason" label="请假事由" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请简要说明请假原因..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>提交申请</Button>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const tabItems = [
    { key: 'basic', label: <><UserOutlined />基本资料</>, children: <BasicInfoTab /> },
    { key: 'papers', label: <><FileTextOutlined />文献合集</>, children: <MyPapersTab /> },
    { key: 'bookmarks', label: <><SaveOutlined />我的收藏</>, children: <BookmarksTab /> },
    { key: 'leave', label: <><CalendarOutlined />请假申请</>, children: <LeaveTab /> },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <UserOutlined style={{ marginRight: 8 }} />
        个人资料 — {user?.real_name}
      </Title>
      <Tabs defaultActiveKey="basic" items={tabItems} />
    </div>
  );
};

export default ProfilePage;
