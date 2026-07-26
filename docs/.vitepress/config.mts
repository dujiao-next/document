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
      { text: '单二进制部署（推荐小白）', link: '/deploy/binary' },
      { text: '手动部署', link: '/deploy/manual' },
      { text: 'Docker Compose 部署', link: '/deploy/docker-compose' },
      { text: 'aaPanel 手动部署', link: '/deploy/aapanel' },
      { text: '1Panel 部署', link: '/deploy/1panel' },
    ],
  },
  {
    text: '使用指南',
    items: [
      { text: '后台管理入门', link: '/guide/admin-guide' },
      { text: '卡密管理', link: '/guide/card-secrets' },
      { text: '钱包与礼品卡', link: '/guide/wallet' },
      { text: '优惠券与活动价', link: '/guide/promotions' },
      { text: '会员等级', link: '/guide/member-level' },
      { text: '分销推广', link: '/guide/affiliate' },
      { text: '分销商系统', link: '/guide/reseller' },
      { text: '通知中心配置', link: '/guide/notifications' },
      { text: '安全最佳实践', link: '/guide/security' },
      { text: '常见问题', link: '/guide/faq' },
    ],
  },
  {
    text: '支付',
    items: [{ text: '支付配置与回调指南', link: '/payment/guide' }],
  },
  {
    text: '部署运维',
    items: [
      { text: '升级与迁移', link: '/deploy/upgrade' },
      { text: '备份与恢复', link: '/deploy/backup' },
      { text: '运维 CLI（admin 子命令）', link: '/deploy/admin-cli' },
    ],
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
      { text: '單二進制部署（推薦新手）', link: '/zh-hant/deploy/binary' },
      { text: '手動部署', link: '/zh-hant/deploy/manual' },
      { text: 'Docker Compose 部署', link: '/zh-hant/deploy/docker-compose' },
      { text: 'aaPanel 手動部署', link: '/zh-hant/deploy/aapanel' },
      { text: '1Panel 部署', link: '/zh-hant/deploy/1panel' },
    ],
  },
  {
    text: '使用指南',
    items: [
      { text: '後台管理入門', link: '/zh-hant/guide/admin-guide' },
      { text: '卡密管理', link: '/zh-hant/guide/card-secrets' },
      { text: '錢包與禮品卡', link: '/zh-hant/guide/wallet' },
      { text: '優惠券與活動價', link: '/zh-hant/guide/promotions' },
      { text: '會員等級', link: '/zh-hant/guide/member-level' },
      { text: '分銷推廣', link: '/zh-hant/guide/affiliate' },
      { text: '分銷商系統', link: '/zh-hant/guide/reseller' },
      { text: '通知中心設定', link: '/zh-hant/guide/notifications' },
      { text: '安全最佳實踐', link: '/zh-hant/guide/security' },
      { text: '常見問題', link: '/zh-hant/guide/faq' },
    ],
  },
  {
    text: '支付',
    items: [{ text: '支付配置與回調指南', link: '/zh-hant/payment/guide' }],
  },
  {
    text: '部署維運',
    items: [
      { text: '升級與遷移', link: '/zh-hant/deploy/upgrade' },
      { text: '備份與還原', link: '/zh-hant/deploy/backup' },
      { text: '維運 CLI（admin 子指令）', link: '/zh-hant/deploy/admin-cli' },
    ],
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
      { text: 'Single Binary (Recommended for Beginners)', link: '/en/deploy/binary' },
      { text: 'Manual Deployment', link: '/en/deploy/manual' },
      { text: 'Docker Compose Deployment', link: '/en/deploy/docker-compose' },
      { text: 'aaPanel Deployment', link: '/en/deploy/aapanel' },
      { text: '1Panel Deployment', link: '/en/deploy/1panel' },
    ],
  },
  {
    text: 'User Guide',
    items: [
      { text: 'Admin Panel Guide', link: '/en/guide/admin-guide' },
      { text: 'Card Secret Management', link: '/en/guide/card-secrets' },
      { text: 'Wallet & Gift Cards', link: '/en/guide/wallet' },
      { text: 'Coupons & Activity Pricing', link: '/en/guide/promotions' },
      { text: 'Membership Levels', link: '/en/guide/member-level' },
      { text: 'Affiliate Program', link: '/en/guide/affiliate' },
      { text: 'Reseller System', link: '/en/guide/reseller' },
      { text: 'Notification Center', link: '/en/guide/notifications' },
      { text: 'Security Best Practices', link: '/en/guide/security' },
      { text: 'FAQ', link: '/en/guide/faq' },
    ],
  },
  {
    text: 'Payments',
    items: [{ text: 'Payment Configuration & Callback Guide', link: '/en/payment/guide' }],
  },
  {
    text: 'Operations',
    items: [
      { text: 'Upgrade & Migration', link: '/en/deploy/upgrade' },
      { text: 'Backup & Recovery', link: '/en/deploy/backup' },
      { text: 'Operations CLI (admin subcommand)', link: '/en/deploy/admin-cli' },
    ],
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
          { text: 'DujiaoPay', link: 'https://www.dujiaopay.com' },
          { text: '體驗 Demo', link: 'https://demo.dujiaoka.com' },
          { text: 'Telegram', link: 'http://telegram.me/dujiaonext_official' },
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
            image: '/ads/vmrack.jpg',
            level: 'platinum',
            tag: '戰略品牌合作夥伴',
          },
          {
            title: 'ACEACC.COM | 源頭海外社交帳號批發',
            description: 'facebook賬號購買,Instagram賬號購買批髮,推特Twitter賬號購買,tiktok賬號購買,telegram賬號購買,蘋果ID購買,谷歌Gmail郵箱購買',
            link: 'https://aceacc.com/',
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
            title: 'niuproxy.com | 全球动态住宅源头厂商 0.3$/GB',
            description: '官方合作优惠码：dujiaofaka  全球动态住宅源头厂商 0.3$/GB',
            link: 'https://niuproxy.com/?utm_source=dujiaofaka&utm_medium=dujiaofaka&ref=dujiaofaka',
            level: 'platinum',
            tag: '鉑金贊助商',
            image: '/ads/niuproxy.jpg'
          },
          {
            title: 'TGhao.uk｜全球飛機號批發源頭',
            description: '一手源頭飛機帳號直供，海量庫存，穩定供應，對接聯系客服獲取低價優惠',
            link: 'https://tghao.uk',
            level: 'platinum',
            tag: '鉑金贊助商',
            image: '/ads/niuproxy.jpg'
          },
         /* {
            title: 'GM能量 | 0.6trx一筆',
            description: '預充值能量0.6trx一筆—最便宜的tron能量，點我使用⚡️',
            link: 'https://telegram.me/gm_wallet_bot?start=dujiaonext',
            level: 'platinum',
            tag: '鉑金贊助商',
            image: '/ads/gmtrx.jpg'
          },*/
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
          { text: 'DujiaoPay', link: 'https://www.dujiaopay.com' },
          { text: 'Live Demo', link: 'https://demo.dujiaoka.com' },
          { text: 'Telegram', link: 'http://telegram.me/dujiaonext_official' },
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
            image: '/ads/vmrack.jpg',
            level: 'platinum',
            tag: 'Strategic Brand Partner',
          },
          {
            title: 'ACEACC.COM | Wholesale Social Media Accounts from the Source',
            description: 'Buy Facebook accounts, Wholesale Instagram accounts, Buy Twitter accounts, Buy TikTok accounts, Buy Telegram accounts, Buy Apple IDs, Buy Google Gmail accounts',
            link: 'https://aceacc.com/',
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
            title: 'niuproxy.com | Global Dynamic Residential Proxy Provider at $0.3/GB',
            description: 'Official Partner Promo Code: dujiaofaka  Global Dynamic Residential Proxy Provider at $0.3/GB',
            link: 'https://niuproxy.com/?utm_source=dujiaofaka&utm_medium=dujiaofaka&ref=dujiaofaka',
            level: 'platinum',
            tag: 'Platinum Sponsor',
            image: '/ads/niuproxy.jpg'
          },
          {
            title: 'TGhao.uk | Global Wholesale Source of Aircraft Numbers',
            description: 'Direct supply from first-hand source aircraft accounts, massive inventory, stable supply, contact customer service for low price discounts',
            link: 'https://tghao.uk',
            level: 'platinum',
            tag: 'Platinum Sponsor',
            image: '/ads/aqi.jpg'
          },
          /*{
            title: 'GM Energy | 0.6 TRX in a single transaction',
            description: 'Pre-purchased gas: 0.6 TRX per transaction—the cheapest TRON gas. Click here to use it.⚡️',
            link: 'https://telegram.me/gm_wallet_bot?start=dujiaonext',
            level: 'platinum',
            tag: 'Platinum Sponsor',
            image: '/ads/gmtrx.jpg'
          },*/
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
      { text: 'DujiaoPay', link: 'https://www.dujiaopay.com' },
      { text: '体验Demo', link: 'https://demo.dujiaoka.com' },
      { text: 'Telegram群组', link: 'http://telegram.me/dujiaonext_official' },
    ],
    sidebar: rootSidebar,
    socialLinks,
    sponsorAdMode: 'all',
    sponsorHomeAdMode: 'all',
    sponsorHomeTitle: '🏆赞助商',
    sponsorAds: [
      {
        title: 'DujiaoPay | 稳定币收款，结算直达自有钱包',
        description: 'DujiaoPay 为每笔订单生成链上付款指纹，跟踪到账与确认深度，并以签名 webhook 驱动履约；资金按链上转账结算至商户地址，平台只负责识别与通知。',
        link: 'https://www.dujiaopay.com',
        level: 'platinum',
        tag: '生态服务',
        image: '/ads/dujiaopay.png'
      },
      /*{
        title: 'VMRACK.NET | 让Dujiao-Next部署更简单',
        description: '美国三网优化免备案云服务器仅需25刀/年(≈170人民币)，支持：支付宝/paypal/USDT。点我享低价独家闪购！🎉',
        link: 'https://www.vmrack.net/vps/flash-deals/2032397092393959424/?ref_code=5iXmGUMf5f5',
        level: 'platinum',
        tag: '战略品牌合作方',
        image: '/ads/vmrack.jpg'
      },*/
      {
        title: 'ACEACC.COM | 源头海外社交账号批发',
        description: 'facebook账号购买,Instagram账号购买批发,推特Twitter账号购买,tiktok账号购买,telegram账号购买,苹果ID购买,谷歌Gmail邮箱购买',
        link: 'https://aceacc.com/',
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
        title: 'niuproxy.com | 全球动态住宅源头厂商 0.3$/GB',
        description: '官方合作优惠码：dujiaofaka  全球动态住宅源头厂商 0.3$/GB',
        link: 'https://niuproxy.com/?utm_source=dujiaofaka&utm_medium=dujiaofaka&ref=dujiaofaka',
        level: 'platinum',
        tag: '铂金赞助商',
        image: '/ads/niuproxy.jpg'
      },
      /*{
        title: 'GM能量 ｜ 0.6trx一笔',
        description: '预充值能量0.6trx一笔—最便宜的tron能量，点我使用⚡️',
        link: 'https://telegram.me/gm_wallet_bot?start=dujiaonext',
        level: 'platinum',
        tag: '铂金赞助商',
        image: '/ads/gmtrx.jpg'
      },*/
      {
        title: '高质量本土 Twitter 账号批发网｜全球覆盖',
        description: '真实粉丝基础，优质老号池，稳定供应体系，支持批量采购与快速交付️',
        link: 'https://tuiteacc.com',
        level: 'platinum',
        tag: '铂金赞助商',
        image: '/ads/yase.jpg'
      },
      {
        title: '全自动开通AI会员机器人🤖',
        description: '正规代充服务，极速秒到，全自动全天24小时自助开通各种AI会员机器人，让人人都能体验AI的乐趣🧠',
        link: 'https://telegram.me/GoAiOpenBot?start=ref_940292582',
        level: 'platinum',
        tag: '铂金赞助商',
        image: '/ads/openai.png'
      },
      {
        title: 'TGhao.uk｜全球飞机号批发源头',
        description: '一手源头飞机账号直供，海量库存，稳定供应，对接联系客服获取低价优惠',
        link: 'https://tghao.uk',
        level: 'platinum',
        tag: '铂金赞助商',
        image: '/ads/aqi.jpg'
      },
      {
        title: '如何成为赞助商？',
        description: '👉点我了解如何成为赞助商，支持开源社区发展',
        link: '/sponsor/become-sponsor',
        level: 'platinum',
        tag: '赞助社区',
      },
    ],
    footer: {
      message: 'Released under the GPLv3 License.',
      copyright: 'Copyright © Dujiao-Next',
    },
  },
})
