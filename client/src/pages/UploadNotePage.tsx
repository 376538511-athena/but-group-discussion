import React, { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, Typography, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import { notesApi } from '../api/notes';
import { getErrorMessage } from '../lib/errors';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

type UploadMode = 'pdf' | 'image' | null;

function getFileMode(file: File | UploadFile): UploadMode {
  const type = file.type || '';
  const name = file.name || '';
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    return 'pdf';
  }
  if (type.startsWith('image/') || /\.(jpe?g|png)$/i.test(name)) {
    return 'image';
  }
  return null;
}

const UploadNotePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const uploadMode = useMemo<UploadMode>(() => (
    fileList.length > 0 ? getFileMode(fileList[0]) : null
  ), [fileList]);

  const onFinish = async (values: any) => {
    const files = fileList
      .map((file) => file.originFileObj)
      .filter((file): file is RcFile => !!file);

    if (files.length === 0) {
      message.error('请上传笔记文件');
      return;
    }

    setLoading(true);
    try {
      await notesApi.create({
        title: values.title,
        note_date: values.note_date.toISOString(),
        summary: values.summary,
        files,
      });
      message.success('笔记上传成功');
      navigate('/profile');
    } catch (error) {
      message.error(getErrorMessage(error, '上传失败'));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    multiple: uploadMode !== 'pdf',
    accept: '.pdf,.jpg,.jpeg,.png',
    beforeUpload: (file: File) => {
      const mode = getFileMode(file);
      if (!mode) {
        message.error('只能上传 PDF、JPG 或 PNG 文件');
        return Upload.LIST_IGNORE;
      }

      const sizeLimitMb = mode === 'pdf' ? 20 : 10;
      if (file.size / 1024 / 1024 > sizeLimitMb) {
        message.error(`${mode === 'pdf' ? 'PDF' : '图片'}大小不能超过 ${sizeLimitMb}MB`);
        return Upload.LIST_IGNORE;
      }

      if (uploadMode && uploadMode !== mode) {
        message.error('PDF 和图片不能混合上传，请先清空已选文件');
        return Upload.LIST_IGNORE;
      }

      if (mode === 'pdf' && fileList.length >= 1) {
        message.error('PDF 笔记只允许上传 1 个文件');
        return Upload.LIST_IGNORE;
      }

      if (mode === 'image' && fileList.length >= 9) {
        message.error('图片笔记最多上传 9 张');
        return Upload.LIST_IGNORE;
      }

      return false;
    },
    onChange: (info: { fileList: UploadFile[] }) => {
      const nextMode = info.fileList[0] ? getFileMode(info.fileList[0]) : null;
      const nextList = nextMode === 'image' ? info.fileList.slice(0, 9) : info.fileList.slice(0, 1);
      setFileList(nextList);
    },
    onRemove: (file: UploadFile) => {
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    },
    fileList,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>上传笔记</Title>

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="title"
            label="笔记标题"
            rules={[{ required: true, message: '请输入笔记标题' }]}
          >
            <Input placeholder="例如：第六周阅读笔记" />
          </Form.Item>

          <Form.Item
            name="note_date"
            label="笔记时间"
            rules={[{ required: true, message: '请选择笔记时间' }]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder="选择笔记时间"
            />
          </Form.Item>

          <Form.Item
            name="summary"
            label="笔记摘要"
            rules={[{ required: true, message: '请输入笔记摘要' }]}
          >
            <TextArea rows={4} placeholder="请简要概括这份笔记的重点内容" />
          </Form.Item>

          <Form.Item label="笔记文件" required>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域</p>
              <p className="ant-upload-hint">
                支持 1 个 PDF，或最多 9 张 JPG/PNG 图片，请勿混合上传
              </p>
            </Dragger>
          </Form.Item>

          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            当前模式：{uploadMode === 'pdf' ? 'PDF 笔记' : uploadMode === 'image' ? `图片笔记（${fileList.length}/9）` : '未选择文件'}
          </Text>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              上传笔记
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default UploadNotePage;
