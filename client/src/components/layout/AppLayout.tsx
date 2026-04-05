import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Typography, Badge, List, Spin, Button,
  Modal, Tag, message as antMessage,
} from 'antd';
import {
  FileTextOutlined, BarChartOutlined, TeamOutlined, UploadOutlined,
  UserOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  BellOutlined, CheckSquareOutlined, UsergroupAddOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/notifications';
import { leaveRequestsApi } from '../../api/leaveRequests';
import type { Notification } from '../../types/notification';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ── Notification type helpers ─────────────────────────────────────────────────
const typeLabel: Record<string, { text: string; color: string }> = {
  leave_request: { text: '请假消息', color: 'orange' },
  approval:      { text: '审批消息', color: 'blue' },
  deactivation:  { text: '退出组织', color: 'red' },
  general:       { text: '系统消息', color: 'default' },
};

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Notification state ────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [detailNotif, setDetailNotif] = useState<Notification | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const count = await notificationsApi.unreadCount();
      setUnreadCount(count);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const handleBellClick = async () => {
    setPanelOpen(true);
    setPanelLoading(true);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data.data);
      setUnreadCount(0);
    } catch (_) {
    } finally {
      setPanelLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const handleOpenDetail = async (notif: Notification) => {
    setDetailNotif(notif);
    if (!notif.is_read) {
      await notificationsApi.markRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleReviewLeave = async (action: 'approved' | 'rejected') => {
    if (!detailNotif?.leave_request_id) return;
    setReviewLoading(true);
    try {
      await leaveRequestsApi.review(detailNotif.leave_request_id, action);
      antMessage.success(action === 'approved' ? '已审批通过' : '已驳回');
      setDetailNotif(null);
      // Refresh list
      const res = await notificationsApi.list();
      setNotifications(res.data.data);
    } catch {
      antMessage.error('操作失败');
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const menuItems = [
    { key: '/dashboard',      icon: <CheckSquareOutlined />,   label: '本周任务' },
    { key: '/papers',         icon: <FileTextOutlined />,      label: '文献列表' },
    { key: '/papers/upload',  icon: <UploadOutlined />,        label: '上传文献' },
    { key: '/stats',          icon: <BarChartOutlined />,      label: '任务考勤' },
    { key: '/members',        icon: <UsergroupAddOutlined />,  label: 'BUT成员' },
    ...(user?.role === 'admin'
      ? [{ key: '/admin/members', icon: <TeamOutlined />, label: '成员管理' }]
      : []),
  ];

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />,   label: '个人资料' },
    { type: 'divider' as const },
    { key: 'logout',  icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'profile') navigate('/profile');
    if (key === 'logout') void logout().finally(() => navigate('/login'));
  };

  // ── Detail modal footer ───────────────────────────────────────────────────
  const detailFooter = detailNotif?.type === 'leave_request' && user?.role === 'admin'
    ? [
        <Button
          key="reject"
          icon={<CloseCircleOutlined />}
          danger
          loading={reviewLoading}
          onClick={() => handleReviewLeave('rejected')}
        >
          驳回
        </Button>,
        <Button
          key="approve"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={reviewLoading}
          onClick={() => handleReviewLeave('approved')}
        >
          审批通过
        </Button>,
      ]
    : [
        <Button key="close" onClick={() => setDetailNotif(null)}>关闭</Button>,
      ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Text strong style={{ fontSize: collapsed ? 16 : 18, color: '#002147', whiteSpace: 'nowrap' }}>
            {collapsed ? 'OB' : 'OurBUT'}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, cursor: 'pointer', color: '#002147' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Bell icon */}
            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
              <BellOutlined
                style={{ fontSize: 20, cursor: 'pointer', color: '#002147' }}
                onClick={handleBellClick}
              />
            </Badge>

            {/* User dropdown */}
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#002147' }} icon={<UserOutlined />} src={user?.avatar_url} />
                <Text>{user?.real_name}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 24, padding: 24, background: 'transparent', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>

      {/* ── Notification Panel Modal ───────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span>消息通知</span>
            {notifications.some((n) => !n.is_read) && (
              <Button type="link" size="small" onClick={handleMarkAllRead} style={{ padding: 0 }}>
                全部已读
              </Button>
            )}
          </div>
        }
        open={panelOpen}
        onCancel={() => setPanelOpen(false)}
        footer={null}
        width={480}
        bodyStyle={{ padding: '8px 0', maxHeight: 520, overflowY: 'auto' }}
      >
        {panelLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>暂无消息</div>
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notif) => {
              const tl = typeLabel[notif.type] ?? typeLabel.general;
              return (
                <List.Item
                  key={notif.id}
                  style={{
                    padding: '12px 24px',
                    background: notif.is_read ? 'transparent' : '#f0f5ff',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleOpenDetail(notif)}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={tl.color} style={{ fontSize: 11 }}>{tl.text}</Tag>
                        <Text strong style={{ fontSize: 13 }}>{notif.title}</Text>
                        {!notif.is_read && (
                          <span style={{ width: 6, height: 6, background: '#f5222d', borderRadius: '50%', flexShrink: 0 }} />
                        )}
                      </div>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(notif.created_at).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Modal>

      {/* ── Notification Detail Modal ──────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {detailNotif && (
              <Tag color={typeLabel[detailNotif.type]?.color ?? 'default'}>
                {typeLabel[detailNotif.type]?.text ?? '系统消息'}
              </Tag>
            )}
            <span>{detailNotif?.title}</span>
          </div>
        }
        open={!!detailNotif}
        onCancel={() => setDetailNotif(null)}
        footer={detailFooter}
        width={480}
      >
        {detailNotif && (
          <div>
            <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{detailNotif.content}</Text>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(detailNotif.created_at).format('YYYY年MM月DD日 HH:mm')}
              </Text>
            </div>
            {detailNotif.type === 'leave_request' && user?.role === 'admin' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#fff7e6',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#d46b08',
                }}
              >
                请假申请待审批，点击"审批通过"或"驳回"处理。
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default AppLayout;
