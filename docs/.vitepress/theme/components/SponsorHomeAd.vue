<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { pickSponsorsByMode, resolveSponsorAds, type DujiaoThemeConfig } from '../sponsor'

const { theme } = useData<DujiaoThemeConfig>()

const homeAds = computed(() => {
  return resolveSponsorAds(theme.value).filter((ad) => ad.placements.includes('home'))
})

const displayAds = computed(() => {
  return pickSponsorsByMode(homeAds.value, theme.value?.sponsorHomeAdMode, 'sponsor-home')
})

const sectionTitle = computed(() => {
  return String(theme.value?.sponsorHomeTitle || '合作赞助商').trim() || '合作赞助商'
})
</script>

<template>
  <section v-if="displayAds.length > 0" class="dn-home-sponsor" aria-label="Sponsor Home">
    <div class="dn-home-sponsor-container">
      <h2 class="dn-home-sponsor-title">{{ sectionTitle }}</h2>

      <div class="dn-home-sponsor-items">
        <div
          v-for="(ad, index) in displayAds"
          :key="`home-${index}-${ad.link}-${ad.image}-${ad.displayTitle}`"
          class="dn-home-sponsor-item-wrap"
        >
          <component
            :is="ad.link ? 'a' : 'div'"
            class="dn-home-sponsor-card"
            :href="ad.link || undefined"
            :target="ad.link ? '_blank' : undefined"
            :rel="ad.link ? 'noopener noreferrer sponsored' : undefined"
            :title="ad.displayTitle || ad.description || 'Sponsor'"
          >
            <article class="dn-home-sponsor-box">
              <img
                v-if="ad.image"
                :src="ad.image"
                :alt="ad.displayTitle || 'Sponsor'"
                loading="lazy"
                class="dn-home-sponsor-image"
              />
              <h3 class="dn-home-sponsor-card-title">{{ ad.displayTitle || 'Sponsor' }}</h3>
              <p v-if="ad.description" class="dn-home-sponsor-card-desc">{{ ad.description }}</p>
            </article>
          </component>
        </div>
      </div>
    </div>
  </section>
</template>
