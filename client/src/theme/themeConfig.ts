import type { ThemeConfig } from 'antd';

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#002147',
    colorSuccess: '#52c41a',
    colorError: '#f5222d',
    colorWarning: '#faad14',
    colorInfo: '#002147',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    colorBgLayout: '#f5f7fa',
    colorBgContainer: '#ffffff',
  },
  components: {
    Layout: {
      headerBg: '#002147',
      siderBg: '#ffffff',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      itemSelectedBg: '#e6f0ff',
      itemSelectedColor: '#002147',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(0, 33, 71, 0.1)',
    },
    Card: {
      boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.06)',
    },
  },
};

export default themeConfig;
