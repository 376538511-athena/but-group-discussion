import React, { useEffect, useState } from 'react';
import {
  Card, Avatar, Typography, Tabs, List, Empty, Spin, Button, message,
} from 'antd';
import { UserOutlined, FileTextOutlined, ReadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mapProfile } from '../lib/database';
import { papersApi } from '../api/papers';
import { notesApi } from '../api/notes';
import NoteList from '../components/notes/NoteList';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/errors';
import type { User } from '../types/user';
import type { Paper } from '../types/paper';
import type { Note } from '../types/note';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// ── 文献合集 (read-only) ──────────────────────────────────────────────────────
const MemberPapersTab: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    papersApi
      .list({ limit: 100 })
      .then((res) => {
        setPapers((res.data.data || []).filter((p: Paper) => p.uploader_id === userId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Card loading={loading}>
      {papers.length === 0 ? (
        <Empty description="该成员暂无上传文献" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={papers}
          renderItem={(paper) => (
            <List.Item
              key={paper.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/papers/${paper.id}`)}
            >
              <List.Item.Meta
                avatar={<FileTextOutlined style={{ fontSize: 20, color: '#002147' }} />}
                title={<Text style={{ color: '#1a0dab' }}>{paper.title}</Text>}
                description={
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {paper.authors} · {dayjs(paper.created_at).format('YYYY-MM-DD')}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

const MemberNotesTab: React.FC<{ userId: string; canDelete?: boolean }> = ({ userId, canDelete = false }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchNotes = () => {
    notesApi
      .listByUser(userId)
      .then((res) => setNotes(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotes();
  }, [userId]);

  const handleDelete = async (noteId: number) => {
    setDeletingId(noteId);
    try {
      await notesApi.delete(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      message.success('笔记已删除');
    } catch (error) {
      message.error(getErrorMessage(error, '删除失败'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <NoteList
      notes={notes}
      loading={loading}
      emptyText="该成员暂无笔记"
      showDelete={canDelete}
      onDelete={handleDelete}
      deletingId={deletingId}
    />
  );
};

// ── Main MemberProfilePage ────────────────────────────────────────────────────
const MemberProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (!error && data) setMember(mapProfile(data as any));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (!member) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Text type="secondary">成员不存在</Text>
        <br />
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/members')}>返回成员列表</Button>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'papers',
      label: <><FileTextOutlined style={{ marginRight: 6 }} />文献合集</>,
      children: <MemberPapersTab userId={member.id} />,
    },
    {
      key: 'notes',
      label: <><ReadOutlined style={{ marginRight: 6 }} />我的笔记</>,
      children: <MemberNotesTab userId={member.id} canDelete={user?.role === 'admin'} />,
    },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/members')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        返回成员列表
      </Button>

      {/* Profile Card */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Avatar
            size={80}
            src={member.avatar_url}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#002147', flexShrink: 0 }}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>{member.real_name}</Title>
            {member.college && (
              <Text type="secondary" style={{ display: 'block', fontSize: 14 }}>
                {member.college}
              </Text>
            )}
            {member.research_direction && (
              <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
                研究方向：{member.research_direction}
              </Text>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultActiveKey="papers" items={tabItems} />
    </div>
  );
};

export default MemberProfilePage;
