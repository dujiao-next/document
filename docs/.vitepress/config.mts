import { defineConfigWithTheme } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import type { DujiaoThemeConfig } from './theme/sponsor'

type ConfigWithSponsor = DefaultTheme.Config & DujiaoThemeConfig

export default defineConfigWithTheme<ConfigWithSponsor>({
  lang: 'zh-CN',
  title: 'Dujiao-Next 官方文档',
  description: 'Dujiao-Next 部署、配置与 API 集成文档',
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ['script', { defer: '', 'data-domain': 'dujiaoka.com', src: 'https://stats.utf8.hk/vue.min.js', 'data-api': 'https://stats.utf8.hk/car/go' }],
  ],
  themeConfig: {
    nav: [
      { text: '指南', link: '/intro/about' },
      { text: '体验Demo', link: 'https://demo.dujiaoka.com' },
      { text: 'Telegram', link: 'https://t.me/dujiaoka' },
    ],

    sidebar: [
      {
        text: '简介',
        items: [
          { text: '关于 Dujiao-Next', link: '/intro/about' },
          { text: '环境要求', link: '/intro/requirements' },
          { text: '更新日志', link: '/intro/changelog' },
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
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/dujiao-next' }],

    sponsorAdMode: 'all',
    sponsorHomeAdMode: 'all',
    sponsorHomeTitle: '合作赞助商',
    sponsorAds: [
      {
        title: '♥️成为赞助商♥️',
        description: '支持项目发展',
        link: '/sponsor/become-sponsor',
        level: 'platinum',
      }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Dujiao-Next',
    },
  },
})
