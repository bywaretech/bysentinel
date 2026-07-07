
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

interface _GlobalComponents {
  Badge: typeof import("../../app/components/ui/Badge.vue")['default']
  Button: typeof import("../../app/components/ui/Button.vue")['default']
  Card: typeof import("../../app/components/ui/Card.vue")['default']
  CardContent: typeof import("../../app/components/ui/CardContent.vue")['default']
  CardDescription: typeof import("../../app/components/ui/CardDescription.vue")['default']
  CardFooter: typeof import("../../app/components/ui/CardFooter.vue")['default']
  CardHeader: typeof import("../../app/components/ui/CardHeader.vue")['default']
  CardTitle: typeof import("../../app/components/ui/CardTitle.vue")['default']
  Input: typeof import("../../app/components/ui/Input.vue")['default']
  Label: typeof import("../../app/components/ui/Label.vue")['default']
  Select: typeof import("../../app/components/ui/Select.vue")['default']
  Separator: typeof import("../../app/components/ui/Separator.vue")['default']
  Skeleton: typeof import("../../app/components/ui/Skeleton.vue")['default']
  Switch: typeof import("../../app/components/ui/Switch.vue")['default']
  AppSidebar: typeof import("../../app/components/AppSidebar.vue")['default']
  AppTopbar: typeof import("../../app/components/AppTopbar.vue")['default']
  BrandMark: typeof import("../../app/components/BrandMark.vue")['default']
  CodeBlock: typeof import("../../app/components/CodeBlock.vue")['default']
  EmptyState: typeof import("../../app/components/EmptyState.vue")['default']
  IncidentTable: typeof import("../../app/components/IncidentTable.vue")['default']
  MetricCard: typeof import("../../app/components/MetricCard.vue")['default']
  SeverityBadge: typeof import("../../app/components/SeverityBadge.vue")['default']
  SeverityBars: typeof import("../../app/components/SeverityBars.vue")['default']
  TimelineView: typeof import("../../app/components/TimelineView.vue")['default']
  Toaster: typeof import("../../app/components/Toaster.vue")['default']
  TrendChart: typeof import("../../app/components/TrendChart.vue")['default']
  NuxtWelcome: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtAnnouncer: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-announcer")['default']
  NuxtImg: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  NuxtPage: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyBadge: LazyComponent<typeof import("../../app/components/ui/Badge.vue")['default']>
  LazyButton: LazyComponent<typeof import("../../app/components/ui/Button.vue")['default']>
  LazyCard: LazyComponent<typeof import("../../app/components/ui/Card.vue")['default']>
  LazyCardContent: LazyComponent<typeof import("../../app/components/ui/CardContent.vue")['default']>
  LazyCardDescription: LazyComponent<typeof import("../../app/components/ui/CardDescription.vue")['default']>
  LazyCardFooter: LazyComponent<typeof import("../../app/components/ui/CardFooter.vue")['default']>
  LazyCardHeader: LazyComponent<typeof import("../../app/components/ui/CardHeader.vue")['default']>
  LazyCardTitle: LazyComponent<typeof import("../../app/components/ui/CardTitle.vue")['default']>
  LazyInput: LazyComponent<typeof import("../../app/components/ui/Input.vue")['default']>
  LazyLabel: LazyComponent<typeof import("../../app/components/ui/Label.vue")['default']>
  LazySelect: LazyComponent<typeof import("../../app/components/ui/Select.vue")['default']>
  LazySeparator: LazyComponent<typeof import("../../app/components/ui/Separator.vue")['default']>
  LazySkeleton: LazyComponent<typeof import("../../app/components/ui/Skeleton.vue")['default']>
  LazySwitch: LazyComponent<typeof import("../../app/components/ui/Switch.vue")['default']>
  LazyAppSidebar: LazyComponent<typeof import("../../app/components/AppSidebar.vue")['default']>
  LazyAppTopbar: LazyComponent<typeof import("../../app/components/AppTopbar.vue")['default']>
  LazyBrandMark: LazyComponent<typeof import("../../app/components/BrandMark.vue")['default']>
  LazyCodeBlock: LazyComponent<typeof import("../../app/components/CodeBlock.vue")['default']>
  LazyEmptyState: LazyComponent<typeof import("../../app/components/EmptyState.vue")['default']>
  LazyIncidentTable: LazyComponent<typeof import("../../app/components/IncidentTable.vue")['default']>
  LazyMetricCard: LazyComponent<typeof import("../../app/components/MetricCard.vue")['default']>
  LazySeverityBadge: LazyComponent<typeof import("../../app/components/SeverityBadge.vue")['default']>
  LazySeverityBars: LazyComponent<typeof import("../../app/components/SeverityBars.vue")['default']>
  LazyTimelineView: LazyComponent<typeof import("../../app/components/TimelineView.vue")['default']>
  LazyToaster: LazyComponent<typeof import("../../app/components/Toaster.vue")['default']>
  LazyTrendChart: LazyComponent<typeof import("../../app/components/TrendChart.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtAnnouncer: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyNuxtPage: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../../../node_modules/.pnpm/nuxt@4.4.8_@babel+plugin-syntax-jsx@7.29.7_@babel+core@7.29.7__@babel+plugin-syntax-typ_a91d788917ffa0498a409ddcfbceb301/node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
