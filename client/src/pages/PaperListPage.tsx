import React, { useEffect, useState, useCallback } from 'react';
import { Input, Select, Card, Tag, Typography, Spin, Empty, Space, Pagination, Button, Popconfirm, message } from 'antd';
import { SearchOutlined, FileTextOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { papersApi } from '../api/papers';
import dayjs from 'dayjs';
import { getErrorMessage } from '../lib/errors';

const { Title, Text, Paragraph } = Typography;

const PaperListPage: React.FC = () => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await papersApi.list({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        sort,
        order,
      });
      setPapers(res.data.data || []);
      const total = res.data.meta?.total ?? 0;
      setPagination((prev) => ({ ...prev, total }));
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, sort, order]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDeletePaper = async (paperId: number) => {
    try {
      await papersApi.delete(paperId);
      message.success('文献已删除');
      fetchPapers();
    } catch (error) {
      message.error(getErrorMessage(error, '删除失败'));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          文献列表
        </Title>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => navigate('/papers/upload')}
        >
          上传文献
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <Card style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space wrap size="middle">
          <Input.Search
            placeholder="搜索标题、作者、摘要..."
            allowClear
            style={{ width: 320 }}
            onSearch={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Select
            value={sort}
            onChange={setSort}
            style={{ width: 140 }}
            options={[
              { value: 'created_at', label: '上传时间' },
              { value: 'title', label: '标题' },
              { value: 'presentation_date', label: '演讲日期' },
            ]}
          />
          <Select
            value={order}
            onChange={setOrder}
            style={{ width: 100 }}
            options={[
              { value: 'desc', label: '降序' },
              { value: 'asc', label: '升序' },
            ]}
          />
        </Space>
      </Card>

      {/* Paper List - Google Scholar Style */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : papers.length === 0 ? (
        <Empty description="暂无文献" />
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {papers.map((paper) => (
              <Card
                key={paper.id}
                hoverable
                style={{
                  marginBottom: 4,
                  borderLeft: paper.is_uploader
                    ? '3px solid #002147'
                    : paper.user_has_commented
                    ? '3px solid #52c41a'
                    : '3px solid #f5222d',
                }}
                bodyStyle={{ padding: '16px 20px' }}
                onClick={() => navigate(`/papers/${paper.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, marginRight: 16 }}>
                    {/* Title - Scholar Blue Link */}
                    <Text
                      style={{
                        fontSize: 17,
                        color: '#1a0dab',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'block',
                        marginBottom: 4,
                      }}
                    >
                      {paper.title}
                    </Text>

                    {/* Authors - Green */}
                    <Text style={{ color: '#2e7d32', fontSize: 13, display: 'block', marginBottom: 4 }}>
                      {paper.authors}
                    </Text>
                    {paper.journal_source && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        期刊来源: {paper.journal_source}
                      </Text>
                    )}

                    {/* Abstract preview */}
                    {paper.abstract && (
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ fontSize: 13, marginBottom: 6 }}
                      >
                        {paper.abstract}
                      </Paragraph>
                    )}

                    {/* Meta info */}
                    <Space size="middle">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        上传者: {paper.uploader?.real_name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(paper.created_at).format('YYYY-MM-DD')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {paper.comment_count || 0} 评论 | {paper.commentor_count || 0} 人参与
                      </Text>
                    </Space>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {paper.is_uploader ? (
                      <Space direction="vertical" size={8} align="end">
                        <Tag color="blue">我上传的</Tag>
                        <Popconfirm
                          title="确定删除这篇文献吗？"
                          description="会同时删除数据库记录和 PDF 文件。"
                          onConfirm={(event) => {
                            event?.stopPropagation();
                            handleDeletePaper(paper.id);
                          }}
                          onCancel={(event) => event?.stopPropagation()}
                        >
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(event) => event.stopPropagation()}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    ) : paper.user_has_commented ? (
                      <Tag color="success">已参与 Engaged</Tag>
                    ) : (
                      <Tag color="error">待完成 Pending</Tag>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Pagination
              current={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              showTotal={(total) => `共 ${total} 篇文献`}
              showSizeChanger
              onChange={(page, pageSize) =>
                setPagination({ page, limit: pageSize, total: pagination.total })
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

export default PaperListPage;
