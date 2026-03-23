import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Upload, DatePicker, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { papersApi } from '../api/papers';
import { getErrorMessage } from '../lib/errors';

const { Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const UploadPaperPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请上传 PDF 文件');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('authors', values.authors);
      if (values.abstract) formData.append('abstract', values.abstract);
      if (values.presentation_date) {
        formData.append('presentation_date', values.presentation_date.format('YYYY-MM-DD'));
      }
      formData.append('file', fileList[0].originFileObj);

      await papersApi.create(formData);
      message.success('文献上传成功');
      navigate('/papers');
    } catch (error) {
      message.error(getErrorMessage(error, '上传失败'));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file: any) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error('只能上传 PDF 文件');
        return Upload.LIST_IGNORE;
      }
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB');
        return Upload.LIST_IGNORE;
      }
      return false; // prevent auto upload
    },
    onChange: (info: any) => {
      setFileList(info.fileList.slice(-1));
    },
    fileList,
    maxCount: 1,
    accept: '.pdf',
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        上传文献
      </Title>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="title"
            label="论文标题"
            rules={[{ required: true, message: '请输入论文标题' }]}
          >
            <Input placeholder="请输入论文标题" />
          </Form.Item>

          <Form.Item
            name="authors"
            label="作者"
            rules={[{ required: true, message: '请输入作者' }]}
          >
            <Input placeholder="多个作者用逗号分隔" />
          </Form.Item>

          <Form.Item name="abstract" label="摘要">
            <TextArea rows={4} placeholder="请输入论文摘要（选填）" />
          </Form.Item>

          <Form.Item name="presentation_date" label="演讲日期">
            <DatePicker style={{ width: '100%' }} placeholder="选择演讲日期（选填）" />
          </Form.Item>

          <Form.Item
            label="PDF 文件"
            required
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽 PDF 文件到此区域</p>
              <p className="ant-upload-hint">仅支持 PDF 格式，最大 50MB</p>
            </Dragger>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              上传文献
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default UploadPaperPage;
