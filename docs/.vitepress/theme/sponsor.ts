export type SponsorLevel = 'platinum' | 'gold' | 'silver' | 'custom'
export type SponsorPlacement = 'home' | 'side'
export type SponsorDisplayMode = 'all' | 'random'

export type SponsorAdConfig = {
  title?: string
  description?: string
  image?: string
  link?: string
  level?: SponsorLevel
  placements?: SponsorPlacement[]
  tag?: string
}

export type DujiaoThemeConfig = {
  sponsorAd?: SponsorAdConfig
  sponsorAds?: SponsorAdConfig[]
  sponsorAdMode?: SponsorDisplayMode
  sponsorHomeAdMode?: SponsorDisplayMode
  sponsorHomeTitle?: string
}

export type RenderSponsorAd = {
  title: string
  description: string
  image: string
  link: string
  displayTitle: string
  level: SponsorLevel
  placements: SponsorPlacement[]
  tag: string
}

const levelTagMap: Record<SponsorLevel, string> = {
  platinum: '铂金赞助商',
  gold: '黄金赞助商',
  silver: '白银赞助商',
  custom: '赞助商',
}

const normalizeLevel = (value?: string): SponsorLevel => {
  const level = String(value || '').trim().toLowerCase()
  if (level === 'platinum' || level === 'gold' || level === 'silver') {
    return level
  }
  return 'custom'
}

const normalizePlacement = (value?: string): SponsorPlacement | '' => {
  const placement = String(value || '').trim().toLowerCase()
  if (placement === 'home' || placement === 'side') {
    return placement
  }
  return ''
}

const uniquePlacements = (list: SponsorPlacement[]) => {
  const result: SponsorPlacement[] = []
  for (let index = 0; index < list.length; index += 1) {
    const item = list[index]
    if (result.indexOf(item) === -1) {
      result.push(item)
    }
  }
  return result
}

const defaultPlacementsByLevel = (level: SponsorLevel): SponsorPlacement[] => {
  if (level === 'platinum') {
    return ['home', 'side']
  }
  if (level === 'gold' || level === 'silver') {
    return ['side']
  }
  return ['side']
}

const normalizePlacements = (level: SponsorLevel, placements?: SponsorPlacement[]) => {
  const normalized = Array.isArray(placements)
    ? placements.map((item) => normalizePlacement(item)).filter((item): item is SponsorPlacement => item !== '')
    : []
  if (normalized.length > 0) {
    return uniquePlacements(normalized)
  }
  return defaultPlacementsByLevel(level)
}

const hashString = (text: string) => {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

const normalizeAd = (input?: SponsorAdConfig): RenderSponsorAd => {
  const level = normalizeLevel(input?.level)
  const title = String(input?.title || '').trim()
  const description = String(input?.description || '').trim()
  const image = String(input?.image || '').trim()
  const link = String(input?.link || '').trim()
  const displayTitle = title || (link ? 'Sponsor' : '')
  const placements = normalizePlacements(level, input?.placements)
  const tag = String(input?.tag || levelTagMap[level]).trim() || levelTagMap[level]

  return {
    title,
    description,
    image,
    link,
    displayTitle,
    level,
    placements,
    tag,
  }
}

export const resolveSponsorAds = (themeConfig?: DujiaoThemeConfig): RenderSponsorAd[] => {
  const listFromArray = Array.isArray(themeConfig?.sponsorAds) ? themeConfig?.sponsorAds || [] : []
  const sourceList = listFromArray.length > 0 ? listFromArray : (themeConfig?.sponsorAd ? [themeConfig.sponsorAd] : [])

  return sourceList
    .map((item) => normalizeAd(item))
    .filter((item) => item.image !== '' || item.displayTitle !== '' || item.description !== '' || item.link !== '')
}

export const pickSponsorsByMode = (ads: RenderSponsorAd[], mode: SponsorDisplayMode | undefined, seed: string) => {
  if (ads.length === 0) {
    return []
  }
  if (mode === 'all') {
    return ads
  }
  const safeSeed = String(seed || 'sponsor')
  const index = hashString(safeSeed) % ads.length
  return [ads[index]]
}
