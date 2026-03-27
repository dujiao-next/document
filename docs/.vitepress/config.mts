import { defineConfigWithTheme } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
import type { DujiaoThemeConfig } from './theme/sponsor'

type ConfigWithSponsor = DefaultTheme.Config & DujiaoThemeConfig

const analyticsScript = [
  ['link', { rel: 'icon', href: '/dj.svg' }],
  ['script', { defer: '', 'data-domain': 'dujiao-next.com', src: 'https://stats.utf8.hk/vue.min.js', 'data-api': 'https://stats.utf8.hk/car/go' }],
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
    text: '部署',
    items: [
      { text: '部署总览', link: '/deploy/' },
      { text: '手动部署', link: '/deploy/manual' },
      { text: 'Docker Compose 部署', link: '/deploy/docker-compose' },
      { text: 'aaPanel 手动部署', link: '/deploy/aapanel' },
    ],
  },
  {
    text: '支付',
    items: [{ text: '支付配置与回调指南', link: '/payment/guide' }],
  },
  {
    text: '社区',
    items: [{ text: '社区共享项目', link: '/community/projects' }],
  },
  {
    text: 'API 集成',
    items: [
      { text: 'User 前台 API 文档', link: '/api/frontend-api' },
      { text: '站点对接说明', link: '/api/integration-guide' },
      { text: '站点对接 API 文档', link: '/api/integration-open-api' },
    ],
  },
  {
    text: '官方服务',
    items: [
      { text: '官方服务说明', link: '/services/official-services' },
      { text: 'Telegram Bot 服务介绍', link: '/services/telegram-bot' },
    ],
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
    text: '部署',
    items: [
      { text: '部署總覽', link: '/zh-hant/deploy/' },
      { text: '手動部署', link: '/zh-hant/deploy/manual' },
      { text: 'Docker Compose 部署', link: '/zh-hant/deploy/docker-compose' },
      { text: 'aaPanel 手動部署', link: '/zh-hant/deploy/aapanel' },
    ],
  },
  {
    text: '支付',
    items: [{ text: '支付配置與回調指南', link: '/zh-hant/payment/guide' }],
  },
  {
    text: '社群',
    items: [{ text: '社群共享專案', link: '/zh-hant/community/projects' }],
  },
  {
    text: 'API 整合',
    items: [
      { text: 'User 前台 API 文件', link: '/zh-hant/api/frontend-api' },
      { text: '站點對接說明', link: '/zh-hant/api/integration-guide' },
      { text: '站點對接 API 文件', link: '/zh-hant/api/integration-open-api' },
    ],
  },
  {
    text: '官方服務',
    items: [
      { text: '官方服務說明', link: '/zh-hant/services/official-services' },
      { text: 'Telegram Bot 服務介紹', link: '/zh-hant/services/telegram-bot' },
    ],
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
    text: 'Deployment',
    items: [
      { text: 'Deployment Overview', link: '/en/deploy/' },
      { text: 'Manual Deployment', link: '/en/deploy/manual' },
      { text: 'Docker Compose Deployment', link: '/en/deploy/docker-compose' },
      { text: 'aaPanel Deployment', link: '/en/deploy/aapanel' },
    ],
  },
  {
    text: 'Payments',
    items: [{ text: 'Payment Configuration & Callback Guide', link: '/en/payment/guide' }],
  },
  {
    text: 'Community',
    items: [{ text: 'Community Shared Projects', link: '/en/community/projects' }],
  },
  {
    text: 'API Integration',
    items: [
      { text: 'User Frontend API Docs', link: '/en/api/frontend-api' },
      { text: 'Site Integration Guide', link: '/en/api/integration-guide' },
      { text: 'Site Integration Open API', link: '/en/api/integration-open-api' },
    ],
  },
  {
    text: 'Official Services',
    items: [
      { text: 'Official Services Overview', link: '/en/services/official-services' },
      { text: 'Telegram Bot Service Overview', link: '/en/services/telegram-bot' },
    ],
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
          { text: '官方服務', link: '/zh-hant/services/official-services' },
          { text: '體驗 Demo', link: 'https://demo.dujiaoka.com' },
          { text: 'Telegram', link: 'https://t.me/dujiaoka' },
        ],
        sidebar: zhHantSidebar,
        sponsorAdMode: 'all',
        sponsorHomeAdMode: 'all',
        sponsorHomeTitle: '🏆贊助商',
        sponsorAds: [
          {
            title: 'VMRACK.NET | 讓 Dujiao-Next 部署更簡單',
            description: '美國三網優化免備案雲服務器僅需25刀/年(≈170人民幣)，支持：支付寶/paypal/USDT。點我享低價獨家閃購！🎉',
            link: 'https://www.vmrack.net/vps/flash-deals/2032397092393959424/?ref_code=5iXmGUMf5f5',
            image: '/vmrack.jpg',
            level: 'platinum',
            tag: '戰略品牌合作夥伴',
          },
          {
            title: 'CEOACC.COM | 源頭海外社交帳號批發',
            description: 'facebook賬號購買,Instagram賬號購買批髮,推特Twitter賬號購買,tiktok賬號購買,telegram賬號購買,蘋果ID購買,谷歌Gmail郵箱購買',
            link: 'https://ceoacc.com/',
            level: 'platinum',
            tag: '鉑金贊助商',
          },
          {
            title: 'HWAIHAO.COM | TG批髮供應商',
            description: '海外號批髮網專住於各國TG及海外社交推特賬號的零售批髮,包括推特Twitter、臉書Facebook、谷歌郵箱Gmail、Instagram、Discord、海外版抖音TikTok、電報Telegram、Reddit、領英LinkedIn等',
            link: 'https://hwaihao.com',
            level: 'platinum',
            tag: '鉑金贊助商',
          },
          {
            title: '@ipmakersX | 全球 IP 代理 服務商',
            description: 'Telegram 上最大的 代理IP 服務商，客戶遍佈社交媒體、掛機系統、電商矩陣、爬蟲等多個領域。',
            link: 'https://t.me/ipmakersX',
            level: 'platinum',
            tag: '鉑金贊助商',
          },
          {
            title: '米哈的Telegram一站式工具庫',
            description: 'telegram的賬號處理專家，爲號商服務到底~',
            link: 'https://miha.uk/product',
            level: 'platinum',
            tag: '鉑金贊助商',
          },
          {
            title: 'okkproxy.com | 全球動態住宅-靜態住宅',
            description: '官方合作優惠碼：dujiaofaka  業務覆蓋全球動態住宅、靜態住宅、移動動態網絡等等',
            link: 'https://okkproxy.com/?utm_source=dujiaofaka&utm_medium=web',
            level: 'platinum',
            tag: '鉑金贊助商',
          },
          {
            title: 'GM能量 | 0.6trx一筆',
            description: '預充值能量0.6trx一筆—最便宜的tron能量，點我使用⚡️',
            link: 'https://t.me/gm_wallet_bot?start=tgrRHVqaWFvX3x0ZzQ5bzl0NXE',
            level: 'platinum',
            tag: '鉑金贊助商',
            image: '/ads/gmtrx.jpg'
          },
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
          { text: 'Official Services', link: '/en/services/official-services' },
          { text: 'Live Demo', link: 'https://demo.dujiaoka.com' },
          { text: 'Telegram', link: 'https://t.me/dujiaoka' },
        ],
        sidebar: enSidebar,
        sponsorAdMode: 'all',
        sponsorHomeAdMode: 'all',
        sponsorHomeTitle: '🏆Sponsors',
        sponsorAds: [
          {
            title: 'VMRACK.NET | Make Dujiao-Next deployment easier',
            description: 'A global automated cloud infrastructure provider offering cloud servers, bare metal, CDN, media processing, object storage, and networking solutions for production-grade deployment scenarios.',
            link: 'https://www.vmrack.net/vps/flash-deals/2032397092393959424/?ref_code=5iXmGUMf5f5',
            image: '/vmrack.jpg',
            level: 'platinum',
            tag: 'Strategic Brand Partner',
          },
          {
            title: 'CEOACC.COM | Wholesale Social Media Accounts from the Source',
            description: 'Buy Facebook accounts, Wholesale Instagram accounts, Buy Twitter accounts, Buy TikTok accounts, Buy Telegram accounts, Buy Apple IDs, Buy Google Gmail accounts',
            link: 'https://ceoacc.com/',
            level: 'platinum',
            tag: 'Platinum Sponsor',
          },
          {
            title: 'HWAIHAO.COM | TG Wholesale Supplier',
            description: 'Overseas Account Wholesale Network specializes in retail and wholesale of international Telegram and overseas social media accounts, including Twitter, Facebook, Gmail, Instagram, Discord, TikTok (international version), Telegram, Reddit, LinkedIn, and more.',
            link: 'https://hwaihao.com',
            level: 'platinum',
            tag: 'Platinum Sponsor',
          },
          {
            title: '@ipmakersX | Global IP Proxy Service Provider',
            description: 'One of the premium proxy service provider on Telegram, serving clients across social media operations, automation systems, e-commerce matrices, web scraping, and more.',
            link: 'https://t.me/ipmakersX',
            level: 'platinum',
            tag: 'Platinum Sponsor',
          },
          {
            title: 'Miha | Telegram One-Stop Tool Library',
            description: 'Telegram account management experts, providing comprehensive services for account sellers~',
            link: 'https://miha.uk/product',
            level: 'platinum',
            tag: 'Platinum Sponsor',
          },
          {
            title: 'okkproxy.com | Global Dynamic Houses - Static Houses',
            description: 'Official partnership discount code: dujiaofaka. Services cover global dynamic homes, static homes, mobile dynamic networks, etc.',
            link: 'https://okkproxy.com/?utm_source=dujiaofaka&utm_medium=web',
            level: 'platinum',
            tag: 'Platinum Sponsor',
          },
          {
            title: 'GM Energy | 0.6 TRX in a single transaction',
            description: 'Pre-purchased gas: 0.6 TRX per transaction—the cheapest TRON gas. Click here to use it.⚡️',
            link: 'https://t.me/gm_wallet_bot?start=tgrRHVqaWFvX3x0ZzQ5bzl0NXE',
            level: 'platinum',
            tag: 'Platinum Sponsor',
            image: '/ads/gmtrx.jpg'
          },
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
      { text: '官方服务', link: '/services/official-services' },
      { text: '体验Demo', link: 'https://demo.dujiaoka.com' },
      { text: 'Telegram', link: 'https://t.me/dujiaoka' },
    ],
    sidebar: rootSidebar,
    socialLinks,
    sponsorAdMode: 'all',
    sponsorHomeAdMode: 'all',
    sponsorHomeTitle: '🏆赞助商',
    sponsorAds: [
      {
        title: 'VMRACK.NET | 让Dujiao-Next部署更简单',
        description: '美国三网优化免备案云服务器仅需25刀/年(≈170人民币)，支持：支付宝/paypal/USDT。点我享低价独家闪购！🎉',
        link: 'https://www.vmrack.net/vps/flash-deals/2032397092393959424/?ref_code=5iXmGUMf5f5',
        level: 'platinum',
        tag: '战略品牌合作方',
      },
      {
        title: 'CEOACC.COM | 源头海外社交账号批发',
        description: 'facebook账号购买,Instagram账号购买批发,推特Twitter账号购买,tiktok账号购买,telegram账号购买,苹果ID购买,谷歌Gmail邮箱购买',
        link: 'https://ceoacc.com/',
        level: 'platinum',
        tag: '铂金赞助商',
      },
      {
        title: 'HWAIHAO.COM | TG批发供应商',
        description: '海外号批发网专住于各国TG及海外社交推特账号的零售批发,包括推特Twitter、脸书Facebook、谷歌邮箱Gmail、Instagram、Discord、海外版抖音TikTok、电报Telegram、Reddit、领英LinkedIn等',
        link: 'https://hwaihao.com',
        level: 'platinum',
        tag: '铂金赞助商',
      },
      {
        title: '@ipmakersX | 全球 IP代理 服务商',
        description: 'Telegram 上最大的 IP 节点服务商,  客户遍布社交媒体、挂机、电商矩阵、爬虫等多个领域。',
        link: 'https://t.me/ipmakersX',
        level: 'platinum',
        tag: '铂金赞助商',
      },
      {
        title: '米哈的Telegram一站式工具库',
        description: 'telegram的账号处理专家，为号商服务到底~',
        link: 'https://miha.uk/product',
        level: 'platinum',
        tag: '铂金赞助商',
      },
      {
        title: 'okkproxy.com | 全球动态住宅-静态住宅',
        description: '官方合作优惠码：dujiaofaka  业务覆盖全球动态住宅、静态住宅、移动动态网络等等',
        link: 'https://okkproxy.com/?utm_source=dujiaofaka&utm_medium=web',
        level: 'platinum',
        tag: '铂金赞助商',
      },
      {
        title: 'GM能量 ｜ 0.6trx一笔',
        description: '预充值能量0.6trx一笔—最便宜的tron能量，点我使用⚡️',
        link: 'https://t.me/gm_wallet_bot?start=tgrRHVqaWFvX3x0ZzQ5bzl0NXE',
        level: 'platinum',
        tag: '铂金赞助商',
        image: '/ads/gmtrx.jpg'
      },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Dujiao-Next',
    },
  },
})
