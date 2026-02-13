import { defineConfigWithTheme } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import type { DujiaoThemeConfig } from './theme/sponsor'

type ConfigWithSponsor = DefaultTheme.Config & DujiaoThemeConfig

const analyticsScript = [
  ['script', { defer: '', 'data-domain': 'dujiaoka.com', src: 'https://stats.utf8.hk/vue.min.js', 'data-api': 'https://stats.utf8.hk/car/go' }],
] as const

const socialLinks: DefaultTheme.SocialLink[] = [{ icon: 'github', link: 'https://github.com/dujiao-next' }]

const rootSidebar: DefaultTheme.Sidebar = [
  {
    text: '简介',
    items: [
      { text: '关于 Dujiao-Next', link: '/intro/about' },
      { text: '环境要求', link: '/intro/requirements' },
      { text: '更新日志', link: '/intro/changelog' },
      { text: '术语统一表', link: '/intro/terminology' },
      { text: '开源仓库与贡献', link: '/intro/open-source' },
    ],
  },
  {
    text: '配置',
    items: [{ text: 'config.yml 详细说明', link: '/config/config-yml' }],
  },
  {
    text: '支付',
    items: [{ text: '支付配置与回调指南', link: '/payment/guide' }],
  },
  {
    text: '部署',
    items: [
      { text: '手动部署', link: '/deploy/manual' },
      { text: 'Docker Compose 部署', link: '/deploy/docker-compose' },
      { text: 'aaPanel 手动部署', link: '/deploy/aapanel' },
    ],
  },
  {
    text: 'API 集成',
    items: [{ text: 'User 前台 API 文档', link: '/api/frontend-api' }],
  },
  {
    text: '赞助',
    items: [
      { text: '成为赞助商', link: '/sponsor/become-sponsor' },
      { text: '白银赞助商清单', link: '/sponsor/silver-sponsors' },
    ],
  },
]

const zhHantSidebar: DefaultTheme.Sidebar = [
  {
    text: '簡介',
    items: [
      { text: '關於 Dujiao-Next', link: '/zh-hant/intro/about' },
      { text: '環境要求', link: '/zh-hant/intro/requirements' },
      { text: '更新日誌', link: '/zh-hant/intro/changelog' },
      { text: '術語統一表', link: '/zh-hant/intro/terminology' },
      { text: '開源倉庫與貢獻', link: '/zh-hant/intro/open-source' },
    ],
  },
  {
    text: '配置',
    items: [{ text: 'config.yml 詳細說明', link: '/zh-hant/config/config-yml' }],
  },
  {
    text: '支付',
    items: [{ text: '支付配置與回調指南', link: '/zh-hant/payment/guide' }],
  },
  {
    text: '部署',
    items: [
      { text: '手動部署', link: '/zh-hant/deploy/manual' },
      { text: 'Docker Compose 部署', link: '/zh-hant/deploy/docker-compose' },
      { text: 'aaPanel 手動部署', link: '/zh-hant/deploy/aapanel' },
    ],
  },
  {
    text: 'API 整合',
    items: [{ text: 'User 前台 API 文件', link: '/zh-hant/api/frontend-api' }],
  },
  {
    text: '贊助',
    items: [
      { text: '成為贊助商', link: '/zh-hant/sponsor/become-sponsor' },
      { text: '白銀贊助商清單', link: '/zh-hant/sponsor/silver-sponsors' },
    ],
  },
]

const enSidebar: DefaultTheme.Sidebar = [
  {
    text: 'Introduction',
    items: [
      { text: 'About Dujiao-Next', link: '/en/intro/about' },
      { text: 'Requirements', link: '/en/intro/requirements' },
      { text: 'Changelog', link: '/en/intro/changelog' },
      { text: 'Terminology Glossary', link: '/en/intro/terminology' },
      { text: 'Open Source & Contribution', link: '/en/intro/open-source' },
    ],
  },
  {
    text: 'Configuration',
    items: [{ text: 'config.yml Reference', link: '/en/config/config-yml' }],
  },
  {
    text: 'Payments',
    items: [{ text: 'Payment Configuration & Callback Guide', link: '/en/payment/guide' }],
  },
  {
    text: 'Deployment',
    items: [
      { text: 'Manual Deployment', link: '/en/deploy/manual' },
      { text: 'Docker Compose Deployment', link: '/en/deploy/docker-compose' },
      { text: 'aaPanel Deployment', link: '/en/deploy/aapanel' },
    ],
  },
  {
    text: 'API Integration',
    items: [{ text: 'User Frontend API Docs', link: '/en/api/frontend-api' }],
  },
  {
    text: 'Sponsorship',
    items: [
      { text: 'Become a Sponsor', link: '/en/sponsor/become-sponsor' },
      { text: 'Silver Sponsors List', link: '/en/sponsor/silver-sponsors' },
    ],
  },
]

export default defineConfigWithTheme<ConfigWithSponsor>({
  lang: 'zh-CN',
  title: 'Dujiao-Next 官方文档',
  description: 'Dujiao-Next 部署、配置与 API 集成文档',
  lastUpdated: true,
  cleanUrls: true,
  head: analyticsScript as unknown as [string, Record<string, string>][],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/',
      title: 'Dujiao-Next 官方文档',
      description: 'Dujiao-Next 部署、配置与 API 集成文档',
    },
    'zh-hant': {
      label: '繁體中文',
      lang: 'zh-Hant',
      link: '/zh-hant/',
      title: 'Dujiao-Next 官方文件',
      description: 'Dujiao-Next 部署、設定與 API 整合文件',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh-hant/intro/about' },
          { text: '體驗 Demo', link: 'https://demo.dujiaoka.com' },
          { text: 'Telegram', link: 'https://t.me/dujiaoka' },
        ],
        sidebar: zhHantSidebar,
        sponsorAdMode: 'all',
        sponsorHomeAdMode: 'all',
        sponsorHomeTitle: '合作贊助商',
        sponsorAds: [
          {
            title: '♥️成為贊助商♥️',
            description: '支持項目發展',
            link: '/zh-hant/sponsor/become-sponsor',
            level: 'platinum',
            tag: '鉑金贊助商',
          },
        ],
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Dujiao-Next Documentation',
      description: 'Deployment, configuration, and API integration docs for Dujiao-Next',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/intro/about' },
          { text: 'Live Demo', link: 'https://demo.dujiaoka.com' },
          { text: 'Telegram', link: 'https://t.me/dujiaoka' },
        ],
        sidebar: enSidebar,
        sponsorAdMode: 'all',
        sponsorHomeAdMode: 'all',
        sponsorHomeTitle: 'Sponsors',
        sponsorAds: [
          {
            title: '♥️ Become a Sponsor ♥️',
            description: 'Support project development',
            link: '/en/sponsor/become-sponsor',
            level: 'platinum',
            tag: 'Platinum Sponsor',
          },
        ],
      },
    },
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/intro/about' },
      { text: '体验Demo', link: 'https://demo.dujiaoka.com' },
      { text: 'Telegram', link: 'https://t.me/dujiaoka' },
    ],
    sidebar: rootSidebar,
    socialLinks,
    sponsorAdMode: 'all',
    sponsorHomeAdMode: 'all',
    sponsorHomeTitle: '合作赞助商',
    sponsorAds: [
      {
        title: '♥️成为赞助商♥️',
        description: '支持项目发展',
        link: '/sponsor/become-sponsor',
        level: 'platinum',
        tag: '铂金赞助商',
      },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Dujiao-Next',
    },
  },
})
