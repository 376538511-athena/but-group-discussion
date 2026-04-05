import React from 'react';
import { Button, Card, Empty, Image, List, Space, Tag, Typography } from 'antd';
import { FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Note } from '../../types/note';

const { Text, Paragraph } = Typography;

function isPdf(mimeType: string) {
  return mimeType === 'application/pdf';
}

function formatFileSize(size: number | null) {
  if (!size) {
    return '';
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const NoteList: React.FC<{
  notes: Note[];
  loading?: boolean;
  emptyText?: string;
}> = ({ notes, loading = false, emptyText = '暂无笔记' }) => {
  return (
    <Card loading={loading}>
      {notes.length === 0 ? (
        <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notes}
          renderItem={(note) => {
            const imageAttachments = note.attachments.filter((attachment) => !isPdf(attachment.mime_type));
            const pdfAttachments = note.attachments.filter((attachment) => isPdf(attachment.mime_type));

            return (
              <List.Item key={note.id}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
                    <div>
                      <Text strong style={{ fontSize: 16, display: 'block' }}>{note.title}</Text>
                      <Space size={[8, 8]} wrap>
                        <Tag color="blue">{dayjs(note.note_date).format('YYYY-MM-DD HH:mm')}</Tag>
                        <Tag>{pdfAttachments.length > 0 ? 'PDF笔记' : `${imageAttachments.length}张图片`}</Tag>
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(note.created_at).format('YYYY-MM-DD')}
                    </Text>
                  </div>

                  {note.summary && (
                    <Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                      {note.summary}
                    </Paragraph>
                  )}

                  {pdfAttachments.length > 0 && (
                    <div style={{ marginBottom: imageAttachments.length > 0 ? 12 : 0 }}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {pdfAttachments.map((attachment) => (
                          <div
                            key={attachment.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              background: '#fafafa',
                              borderRadius: 8,
                            }}
                          >
                            <Space>
                              <FilePdfOutlined style={{ color: '#cf1322', fontSize: 18 }} />
                              <div>
                                <Text strong>{attachment.file_name}</Text>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatFileSize(attachment.file_size)}
                                  </Text>
                                </div>
                              </div>
                            </Space>
                            <Button
                              type="link"
                              onClick={() => attachment.url && window.open(attachment.url, '_blank', 'noopener,noreferrer')}
                              disabled={!attachment.url}
                            >
                              查看文件
                            </Button>
                          </div>
                        ))}
                      </Space>
                    </div>
                  )}

                  {imageAttachments.length > 0 && (
                    <div>
                      <Space style={{ marginBottom: 8 }}>
                        <FileImageOutlined style={{ color: '#1677ff' }} />
                        <Text type="secondary">图片笔记</Text>
                      </Space>
                      <Image.PreviewGroup>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                            gap: 10,
                          }}
                        >
                          {imageAttachments.map((attachment) => (
                            <Image
                              key={attachment.path}
                              src={attachment.url || undefined}
                              alt={attachment.file_name}
                              style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8 }}
                              fallback="data:image/gif;base64,R0lGODlhAQABAAAAACw="
                            />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default NoteList;
