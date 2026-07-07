
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const Badge: typeof import("../app/components/ui/Badge.vue")['default']
export const Button: typeof import("../app/components/ui/Button.vue")['default']
export const Card: typeof import("../app/components/ui/Card.vue")['default']
export const CardContent: typeof import("../app/components/ui/CardContent.vue")['default']
export const CardDescription: typeof import("../app/components/ui/CardDescription.vue")['default']
export const CardFooter: typeof import("../app/components/ui/CardFooter.vue")['default']
export const CardHeader: typeof import("../app/components/ui/CardHeader.vue")['default']
export const CardTitle: typeof import("../app/components/ui/CardTitle.vue")['default']
export const Input: typeof import("../app/components/ui/Input.vue")['default']
export const Label: typeof import("../app/components/ui/Label.vue")['default']
export const Select: typeof import("../app/components/ui/Select.vue")['default']
export const Separator: typeof import("../app/components/ui/Separator.vue")['default']
export const Skeleton: typeof import("../app/components/ui/Skeleton.vue")['default']
export const Switch: typeof import("../app/components/ui/Switch.vue")['default']
export const AppSidebar: typeof import("../app/components/AppSidebar.vue")['default']
export const AppTopbar: typeof import("../app/components/AppTopbar.vue")['default']
export const BrandMark: typeof import("../app/components/BrandMark.vue")['default']
export const CodeBlock: typeof import("../app/components/CodeBlock.vue")['default']
export const EmptyState: typeof import("../app/components/EmptyState.vue")['default']
export const IncidentTable: typeof import("../app/components/IncidentTable.vue")['default']
export const MetricCard: typeof import("../app/components/MetricCard.vue")['default']
export const SeverityBadge: typeof import("../app/components/SeverityBadge.vue")['default']
export const SeverityBars: typeof import("../app/components/SeverityBars.vue")['default']
export const TimelineView: typeof import("../app/components/TimelineView.vue")['default']
export const Toaster: typeof import("../app/components/Toaster.vue")['default']
export const TrendChart: typeof import("../app/components/TrendChart.vue")['default']
export const NuxtWelcome: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtAnnouncer: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
export const NuxtImg: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const NuxtPage: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyBadge: LazyComponent<typeof import("../app/components/ui/Badge.vue")['default']>
export const LazyButton: LazyComponent<typeof import("../app/components/ui/Button.vue")['default']>
export const LazyCard: LazyComponent<typeof import("../app/components/ui/Card.vue")['default']>
export const LazyCardContent: LazyComponent<typeof import("../app/components/ui/CardContent.vue")['default']>
export const LazyCardDescription: LazyComponent<typeof import("../app/components/ui/CardDescription.vue")['default']>
export const LazyCardFooter: LazyComponent<typeof import("../app/components/ui/CardFooter.vue")['default']>
export const LazyCardHeader: LazyComponent<typeof import("../app/components/ui/CardHeader.vue")['default']>
export const LazyCardTitle: LazyComponent<typeof import("../app/components/ui/CardTitle.vue")['default']>
export const LazyInput: LazyComponent<typeof import("../app/components/ui/Input.vue")['default']>
export const LazyLabel: LazyComponent<typeof import("../app/components/ui/Label.vue")['default']>
export const LazySelect: LazyComponent<typeof import("../app/components/ui/Select.vue")['default']>
export const LazySeparator: LazyComponent<typeof import("../app/components/ui/Separator.vue")['default']>
export const LazySkeleton: LazyComponent<typeof import("../app/components/ui/Skeleton.vue")['default']>
export const LazySwitch: LazyComponent<typeof import("../app/components/ui/Switch.vue")['default']>
export const LazyAppSidebar: LazyComponent<typeof import("../app/components/AppSidebar.vue")['default']>
export const LazyAppTopbar: LazyComponent<typeof import("../app/components/AppTopbar.vue")['default']>
export const LazyBrandMark: LazyComponent<typeof import("../app/components/BrandMark.vue")['default']>
export const LazyCodeBlock: LazyComponent<typeof import("../app/components/CodeBlock.vue")['default']>
export const LazyEmptyState: LazyComponent<typeof import("../app/components/EmptyState.vue")['default']>
export const LazyIncidentTable: LazyComponent<typeof import("../app/components/IncidentTable.vue")['default']>
export const LazyMetricCard: LazyComponent<typeof import("../app/components/MetricCard.vue")['default']>
export const LazySeverityBadge: LazyComponent<typeof import("../app/components/SeverityBadge.vue")['default']>
export const LazySeverityBars: LazyComponent<typeof import("../app/components/SeverityBars.vue")['default']>
export const LazyTimelineView: LazyComponent<typeof import("../app/components/TimelineView.vue")['default']>
export const LazyToaster: LazyComponent<typeof import("../app/components/Toaster.vue")['default']>
export const LazyTrendChart: LazyComponent<typeof import("../app/components/TrendChart.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtAnnouncer: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyNuxtPage: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
