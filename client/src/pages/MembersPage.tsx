import React, { useEffect, useState } from 'react';
import { Card, Input, Avatar, Typography, Empty, Spin, Row, Col } from 'antd';
import { UsergroupAddOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listProfiles } from '../lib/database';
import type { User } from '../types/user';

const { Title, Text } = Typography;

const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listProfiles()
      .then((all) => setMembers(all.filter((m) => m.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.real_name.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      (m.college || '').toLowerCase().includes(q) ||
      (m.research_direction || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <UsergroupAddOutlined style={{ marginRight: 8 }} />
          BUT 成员
        </Title>
        <Input
          placeholder="搜索姓名 / 学院 / 研究方向"
          allowClear
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <Empty description="未找到成员" />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((member) => (
            <Col key={member.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => navigate(`/members/${member.id}`)}
                bodyStyle={{ padding: '20px 16px' }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Avatar
                    size={64}
                    src={member.avatar_url}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#002147' }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <Text strong style={{ fontSize: 15, display: 'block' }}>
                      {member.real_name}
                    </Text>
                    {member.college && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                        {member.college}
                      </Text>
                    )}
                  </div>

                  {member.research_direction && (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        width: '100%',
                      }}
                    >
                      {member.research_direction}
                    </Text>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default MembersPage;
