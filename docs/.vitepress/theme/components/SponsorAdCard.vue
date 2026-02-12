<script setup lang="ts">
import type { RenderSponsorAd } from '../sponsor'

defineProps<{
  ad: RenderSponsorAd
}>()
</script>

<template>
  <article class="dn-sponsor-card">
    <a
      v-if="ad.link"
      :href="ad.link"
      target="_blank"
      rel="noopener noreferrer sponsored"
      class="dn-sponsor-link"
    >
      <img v-if="ad.image" :src="ad.image" :alt="ad.displayTitle" loading="lazy" class="dn-sponsor-image" />
      <div class="dn-sponsor-meta" :class="{ 'dn-sponsor-meta--text-only': !ad.image }">
        <div class="dn-sponsor-tag">{{ ad.tag }}</div>
        <div v-if="ad.displayTitle" class="dn-sponsor-title">{{ ad.displayTitle }}</div>
        <div v-if="ad.description" class="dn-sponsor-desc">{{ ad.description }}</div>
      </div>
    </a>

    <div v-else class="dn-sponsor-plain">
      <img v-if="ad.image" :src="ad.image" :alt="ad.displayTitle" loading="lazy" class="dn-sponsor-image" />
      <div class="dn-sponsor-meta" :class="{ 'dn-sponsor-meta--text-only': !ad.image }">
        <div class="dn-sponsor-tag">{{ ad.tag }}</div>
        <div v-if="ad.displayTitle" class="dn-sponsor-title">{{ ad.displayTitle }}</div>
        <div v-if="ad.description" class="dn-sponsor-desc">{{ ad.description }}</div>
      </div>
    </div>
  </article>
</template>
