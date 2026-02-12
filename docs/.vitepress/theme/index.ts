import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import SponsorAsideAd from './components/SponsorAsideAd.vue'
import SponsorHomeAd from './components/SponsorHomeAd.vue'
import './custom.css'

const theme: Theme = {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'aside-outline-after': () => h(SponsorAsideAd),
      'home-features-after': () => h(SponsorHomeAd),
    })
  },
}

export default theme
