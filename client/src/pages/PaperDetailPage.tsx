import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Button, Tag, Divider, Space, Spin, Avatar, Row, Col,
  Input, message, List, Tooltip, Empty, Popconfirm,
} from 'antd';
import {
  DownloadOutlined, CalendarOutlined, UserOutlined, CommentOutlined,
  LikeOutlined, LikeFilled, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SendOutlined, BookOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { papersApi } from '../api/papers';
import { commentsApi } from '../api/comments';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import type { Comment } from '../types/comment';
import { getErrorMessage } from '../lib/errors';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PaperDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [paperRes, commentsRes] = await Promise.all([
        papersApi.getById(parseInt(id)),
        commentsApi.list(parseInt(id)),
      ]);
      setPaper(paperRes.data.data);
      setComments(commentsRes.data.data || []);
    } catch (error) {
      message.error('获取文献信息失败');
      navigate('/papers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async () => {
    try {
      const res = await papersApi.download(parseInt(id!));
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', paper.original_filename || `paper-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await commentsApi.create(parseInt(id!), { content: commentText.trim() });
      setCommentText('');
      message.success('评论发表成功');
      fetchData();
    } catch {
      message.error('评论发表失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await commentsApi.create(parseInt(id!), {
        content: replyText.trim(),
        parent_id: parentId,
      });
      setReplyText('');
      setReplyTo(null);
      message.success('回复成功');
      fetchData();
    } catch {
      message.error('回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: number) => {
    try {
      await commentsApi.toggleLike(commentId);
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentsApi.delete(commentId);
      message.success('评论已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleDeletePaper = async () => {
    try {
      await papersApi.delete(parseInt(id!));
      message.success('文献已删除');
      navigate('/papers');
    } catch (error) {
      message.error(getErrorMessage(error, '删除失败'));
    }
  };

  const renderComment = (comment: Comment, depth: number = 0) => (
    <div
      key={comment.id}
      style={{
        marginLeft: depth > 0 ? 24 : 0,
        borderLeft: depth > 0 ? '2px solid #e8e8e8' : 'none',
        paddingLeft: depth > 0 ? 16 : 0,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <Avatar
          style={{ backgroundColor: '#002147', flexShrink: 0 }}
          icon={<UserOutlined />}
          src={comment.user?.avatar_url}
          size={36}
        />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ marginRight: 8 }}>{comment.user?.real_name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{comment.user?.username} | {dayjs(comment.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
          <Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </Paragraph>
          <Space size="middle">
            <Tooltip title="点赞">
              <Button
                type="text"
                size="small"
                icon={comment.user_has_liked ? <LikeFilled style={{ color: '#002147' }} /> : <LikeOutlined />}
                onClick={() => handleLike(comment.id)}
              >
                {comment.like_count > 0 ? comment.like_count : ''}
              </Button>
            </Tooltip>
            {depth < 2 && (
              <Button
                type="text"
                size="small"
                onClick={() =>
                  setReplyTo(
                    replyTo?.id === comment.id
                      ? null
                      : { id: comment.id, name: comment.user?.real_name }
                  )
                }
              >
                回复
              </Button>
            )}
            {(comment.user_id === user?.id || user?.role === 'admin') && (
              <Popconfirm title="确定删除此评论？" onConfirm={() => handleDeleteComment(comment.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>

          {/* Reply Editor */}
          {replyTo?.id === comment.id && (
            <div style={{ marginTop: 8 }}>
              <TextArea
                rows={2}
                placeholder={`回复 ${replyTo?.name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Button
                  type="primary"
                  size="small"
                  loading={submitting}
                  onClick={() => handleReply(comment.id)}
                  icon={<SendOutlined />}
                >
                  回复
                </Button>
                <Button size="small" onClick={() => { setReplyTo(null); setReplyText(''); }}>
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies?.map((reply: Comment) => renderComment(reply, depth + 1))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!paper) return null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Paper Metadata */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ marginBottom: 8, color: '#002147' }}>
              {paper.title}
            </Title>
            <Text style={{ color: '#2e7d32', fontSize: 15, display: 'block', marginBottom: 12 }}>
              {paper.authors}
            </Text>
            {paper.journal_source && (
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                <BookOutlined style={{ marginRight: 6 }} />
                期刊来源: {paper.journal_source}
              </Text>
            )}
            {paper.abstract && (
              <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 12 }}>
                {paper.abstract}
              </Paragraph>
            )}
            <Space size="middle">
              <Text type="secondary">
                <UserOutlined style={{ marginRight: 4 }} />
                上传者: {paper.uploader?.real_name}
              </Text>
              <Text type="secondary">
                <CalendarOutlined style={{ marginRight: 4 }} />
                {dayjs(paper.created_at).format('YYYY-MM-DD')}
              </Text>
              {paper.presentation_date && (
                <Text type="secondary">
                  演讲日期: {dayjs(paper.presentation_date).format('YYYY-MM-DD')}
                </Text>
              )}
            </Space>
          </div>
          <Space direction="vertical" size="middle">
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload} size="large">
              下载 PDF
            </Button>
            {paper.is_uploader && (
              <Popconfirm
                title="确定删除这篇文献吗？"
                description="该操作会删除 PDF 文件和文献记录。"
                onConfirm={handleDeletePaper}
              >
                <Button danger icon={<DeleteOutlined />}>
                  删除文献
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      {/* Participation Tracker */}
      {paper.participation && (
        <Card
          title={
            <span>
              <CommentOutlined style={{ marginRight: 8 }} />
              评论参与情况 ({paper.participation.engaged_count}/{paper.participation.total_members - 1})
            </span>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Text strong style={{ color: '#52c41a', display: 'block', marginBottom: 8 }}>
                <CheckCircleOutlined /> 已参与 ({paper.participation.engaged_count})
              </Text>
              <Space wrap>
                {paper.participation.engaged_members.map((m: any) => (
                  <Tag key={m.id} color="success" style={{ marginBottom: 4 }}>
                    {m.real_name}
                  </Tag>
                ))}
                {paper.participation.engaged_members.length === 0 && (
                  <Text type="secondary">暂无</Text>
                )}
              </Space>
            </Col>
            <Col span={12}>
              <Text strong style={{ color: '#f5222d', display: 'block', marginBottom: 8 }}>
                <CloseCircleOutlined /> 待完成 ({paper.participation.pending_count})
              </Text>
              <Space wrap>
                {paper.participation.pending_members.map((m: any) => (
                  <Tag key={m.id} color="error" style={{ marginBottom: 4 }}>
                    {m.real_name}
                  </Tag>
                ))}
                {paper.participation.pending_members.length === 0 && (
                  <Text type="secondary" style={{ color: '#52c41a' }}>全员已参与!</Text>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Discussion Thread - GitHub Issue Style */}
      <Card
        title={
          <span>
            <CommentOutlined style={{ marginRight: 8 }} />
            讨论区 ({comments.length} 条评论)
          </span>
        }
      >
        {/* Comment List */}
        {comments.length === 0 ? (
          <Empty description="暂无评论，来发表第一条评论吧" style={{ padding: '24px 0' }} />
        ) : (
          <div style={{ marginBottom: 24 }}>
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}

        <Divider />

        {/* New Comment Editor */}
        <div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Avatar
              style={{ backgroundColor: '#002147', flexShrink: 0 }}
              icon={<UserOutlined />}
              src={user?.avatar_url}
              size={36}
            />
            <div style={{ flex: 1 }}>
              <TextArea
                rows={4}
                placeholder="发表你对这篇文献的看法..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={submitting}
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                >
                  发表评论
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaperDetailPage;
