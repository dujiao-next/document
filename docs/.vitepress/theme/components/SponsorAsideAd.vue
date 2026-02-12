<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import SponsorAdCard from './SponsorAdCard.vue'
import { pickSponsorsByMode, resolveSponsorAds, type DujiaoThemeConfig } from '../sponsor'

const { theme, page } = useData<DujiaoThemeConfig>()

const sideAds = computed(() => {
  return resolveSponsorAds(theme.value).filter((ad) => ad.placements.includes('side'))
})

const displayAds = computed(() => {
  const seed = String(page.value?.relativePath || page.value?.filePath || page.value?.title || 'sponsor-side')
  return pickSponsorsByMode(sideAds.value, theme.value?.sponsorAdMode, seed)
})
</script>

<template>
  <section v-if="displayAds.length > 0" class="dn-sponsor-list" aria-label="Sponsor Aside">
    <SponsorAdCard
      v-for="(ad, index) in displayAds"
      :key="`side-${index}-${ad.link}-${ad.image}-${ad.displayTitle}`"
      :ad="ad"
    />
  </section>
</template>
