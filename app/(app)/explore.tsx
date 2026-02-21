import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, font, spacing, radius } from '@/components/ui/theme'
import { useAIAssistant, ClusterResult, KnowledgeGapResult, TimelineResult, PeriodicReview, PodcastResult, InspirationResult } from '@/hooks/use-ai-assistant'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2

type InsightType = 'cluster' | 'gaps' | 'timeline' | 'review' | 'podcast' | 'inspire'

interface InsightCard {
  type: InsightType
  icon: string
  title: string
  subtitle: string
  color: string
}

const insightCards: InsightCard[] = [
  { type: 'cluster', icon: '🔮', title: '想法聚类', subtitle: '发现隐藏主题', color: '#8B5CF6' },
  { type: 'gaps', icon: '🎯', title: '知识盲区', subtitle: '发现空白点', color: '#EF4444' },
  { type: 'timeline', icon: '📈', title: '思维时间线', subtitle: '追踪想法演化', color: '#10B981' },
  { type: 'review', icon: '📊', title: '定期回顾', subtitle: '知识总结', color: '#F59E0B' },
  { type: 'podcast', icon: '🎙️', title: '每日播客', subtitle: 'AI 生成播客', color: '#EC4899' },
  { type: 'inspire', icon: '✨', title: '灵感推荐', subtitle: '发现新想法', color: '#06B6D4' },
]

export default function ExploreScreen() {
  const isDark = useColorScheme() === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  
  const [activeInsight, setActiveInsight] = useState<InsightType | null>(null)
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null)
  const [gapsResult, setGapsResult] = useState<KnowledgeGapResult | null>(null)
  const [timelineResult, setTimelineResult] = useState<TimelineResult | null>(null)
  const [reviewResult, setReviewResult] = useState<PeriodicReview | null>(null)
  const [podcastResult, setPodcastResult] = useState<PodcastResult | null>(null)
  const [inspireResult, setInspireResult] = useState<InspirationResult | null>(null)
  const [timelineDays, setTimelineDays] = useState(30)
  const [reviewPeriod, setReviewPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  
  const { 
    loading, 
    error, 
    clusterNotes, 
    detectKnowledgeGaps, 
    getTimeline, 
    getPeriodicReview,
    generatePodcast,
    getInspirations
  } = useAIAssistant()

  const handleInsightPress = useCallback(async (type: InsightType) => {
    setActiveInsight(type)
    
    switch (type) {
      case 'cluster':
        const cluster = await clusterNotes()
        setClusterResult(cluster)
        break
      case 'gaps':
        const gaps = await detectKnowledgeGaps()
        setGapsResult(gaps)
        break
      case 'timeline':
        const timeline = await getTimeline(timelineDays)
        setTimelineResult(timeline)
        break
      case 'review':
        const review = await getPeriodicReview(reviewPeriod)
        setReviewResult(review)
        break
      case 'podcast':
        const podcast = await generatePodcast()
        setPodcastResult(podcast)
        break
      case 'inspire':
        const inspire = await getInspirations()
        setInspireResult(inspire)
        break
    }
  }, [clusterNotes, detectKnowledgeGaps, getTimeline, getPeriodicReview, generatePodcast, getInspirations, timelineDays, reviewPeriod])

  const renderInsightContent = () => {
    if (!activeInsight) return null
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>分析中...</Text>
        </View>
      )
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => handleInsightPress(activeInsight)}>
            <Text style={styles.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      )
    }
    
    switch (activeInsight) {
      case 'cluster':
        return renderCluster()
      case 'gaps':
        return renderGaps()
      case 'timeline':
        return renderTimeline()
      case 'review':
        return renderReview()
      case 'podcast':
        return renderPodcast()
      case 'inspire':
        return renderInspire()
      default:
        return null
    }
  }

  const renderCluster = () => {
    if (!clusterResult) return null
    
    return (
      <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>🔮 想法聚类</Text>
        <Text style={[styles.insightSubtitle, { color: theme.textSecondary }]}>
          基于向量相似度发现隐藏主题
        </Text>
        
        {clusterResult.clusters.map((cluster, i) => (
          <View key={i} style={[styles.clusterCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.clusterHeader, { backgroundColor: cluster.color + '20' }]}>
              <Text style={styles.clusterIcon}>{cluster.icon}</Text>
              <Text style={[styles.clusterName, { color: theme.text }]}>{cluster.name}</Text>
              <Text style={[styles.clusterCount, { color: theme.textSecondary }]}>{cluster.note_count} 条笔记</Text>
            </View>
            <Text style={[styles.clusterDesc, { color: theme.textSecondary }]}>{cluster.description}</Text>
            <View style={styles.clusterKeywords}>
              {cluster.keywords.map((kw, j) => (
                <View key={j} style={[styles.keywordTag, { backgroundColor: cluster.color + '15' }]}>
                  <Text style={[styles.keywordText, { color: cluster.color }]}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        
        {clusterResult.insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>💡 洞察</Text>
            {clusterResult.insights.map((insight, i) => (
              <Text key={i} style={[styles.insightItem, { color: theme.textSecondary }]}>• {insight}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    )
  }

  const renderGaps = () => {
    if (!gapsResult) return null
    
    return (
      <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>🎯 知识盲区</Text>
        <Text style={[styles.insightSubtitle, { color: theme.textSecondary }]}>
          发现你知识体系中的空白点
        </Text>
        
        <View style={[styles.coverageCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.coverageLabel, { color: theme.textSecondary }]}>知识覆盖度</Text>
          <Text style={[styles.coverageValue, { color: colors.primary }]}>{gapsResult.coverage_score}%</Text>
          <View style={styles.coverageBar}>
            <View style={[styles.coverageFill, { width: `${gapsResult.coverage_score}%` }]} />
          </View>
        </View>
        
        {gapsResult.gaps.map((gap, i) => (
          <View key={i} style={[styles.gapCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.gapHeader}>
              <Text style={[styles.gapTopic, { color: theme.text }]}>{gap.topic}</Text>
              <Text style={[styles.gapPriority, { color: gap.priority === 'high' ? '#EF4444' : gap.priority === 'medium' ? '#F59E0B' : '#10B981' }]}>
                {gap.priority === 'high' ? '高优先' : gap.priority === 'medium' ? '中优先' : '低优先'}
              </Text>
            </View>
            <Text style={[styles.gapReason, { color: theme.textSecondary }]}>{gap.reason}</Text>
            <Text style={[styles.gapSuggestion, { color: colors.primary }]}>建议: {gap.suggestion}</Text>
          </View>
        ))}
        
        {gapsResult.recommendations.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>📚 学习建议</Text>
            {gapsResult.recommendations.map((rec, i) => (
              <Text key={i} style={[styles.insightItem, { color: theme.textSecondary }]}>• {rec}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    )
  }

  const renderTimeline = () => {
    if (!timelineResult) return null
    
    return (
      <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>📈 思维时间线</Text>
        
        <View style={styles.periodTabs}>
          {[7, 30, 90].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.periodTab, timelineDays === days && { backgroundColor: colors.primary }]}
              onPress={() => { setTimelineDays(days); getTimeline(days).then(setTimelineResult); }}
            >
              <Text style={[styles.periodTabText, timelineDays !== days && { color: theme.text }]}>
                {days === 7 ? '7天' : days === 30 ? '30天' : '90天'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {timelineResult.themes.length > 0 && (
          <View style={styles.themesSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>主题趋势</Text>
            {timelineResult.themes.map((t, i) => (
              <View key={i} style={[styles.themeRow, { backgroundColor: theme.surface }]}>
                <Text style={[styles.themeName, { color: theme.text }]}>{t.name}</Text>
                <Text style={[
                  styles.themeTrend,
                  { color: t.trend === 'rising' ? '#10B981' : t.trend === 'declining' ? '#EF4444' : theme.textSecondary }
                ]}>
                  {t.trend === 'rising' ? '↑ 上升' : t.trend === 'declining' ? '↓ 下降' : '→ 稳定'}
                </Text>
                <Text style={[styles.themeCount, { color: theme.textSecondary }]}>{t.count}</Text>
              </View>
            ))}
          </View>
        )}
        
        {timelineResult.events.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>时间线事件</Text>
            {timelineResult.events.slice(0, 10).map((event, i) => (
              <View key={i} style={styles.eventItem}>
                <View style={styles.eventDot} />
                <View style={[styles.eventCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.eventDate, { color: theme.textSecondary }]}>{event.date}</Text>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                  <Text style={[styles.eventDesc, { color: theme.textSecondary }]} numberOfLines={2}>{event.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {timelineResult.insights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>💡 演化洞察</Text>
            {timelineResult.insights.map((insight, i) => (
              <Text key={i} style={[styles.insightItem, { color: theme.textSecondary }]}>• {insight}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    )
  }

  const renderReview = () => {
    if (!reviewResult) return null
    
    return (
      <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>📊 定期回顾</Text>
        
        <View style={styles.periodTabs}>
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodTab, reviewPeriod === period && { backgroundColor: colors.primary }]}
              onPress={() => { setReviewPeriod(period); getPeriodicReview(period).then(setReviewResult); }}
            >
              <Text style={[styles.periodTabText, reviewPeriod !== period && { color: theme.text }]}>
                {period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '本月'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={[styles.progressCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: colors.primary }]}>{reviewResult.progress.new_notes}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>新笔记</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: '#10B981' }]}>{reviewResult.progress.completed_todos}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>已完成</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: '#F59E0B' }]}>{reviewResult.progress.pending_todos}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>待处理</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={[styles.progressValue, { color: '#8B5CF6' }]}>{reviewResult.progress.new_links}</Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>新链接</Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.summaryText, { color: theme.text }]}>{reviewResult.summary}</Text>
        
        {reviewResult.key_topics.length > 0 && (
          <View style={styles.topicsSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>关键主题</Text>
            {reviewResult.key_topics.map((topic, i) => (
              <View key={i} style={[styles.topicCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.topicName, { color: theme.text }]}>{topic.topic}</Text>
                <Text style={[styles.topicInsight, { color: theme.textSecondary }]}>{topic.key_insight}</Text>
              </View>
            ))}
          </View>
        )}
        
        {reviewResult.highlights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>✨ 亮点</Text>
            {reviewResult.highlights.map((h, i) => (
              <Text key={i} style={[styles.insightItem, { color: theme.textSecondary }]}>• {h}</Text>
            ))}
          </View>
        )}
        
        {reviewResult.next_focus.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>🎯 下一步关注</Text>
            {reviewResult.next_focus.map((f, i) => (
              <Text key={i} style={[styles.insightItem, { color: theme.textSecondary }]}>• {f}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    )
  }

  const renderPodcast = () => {
    if (!podcastResult) return null
    
    return (
      <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>🎙️ 每日播客</Text>
        <Text style={[styles.insightSubtitle, { color: theme.textSecondary }]}>
          AI 生成的知识播客
        </Text>
        
        <View style={[styles.podcastCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.podcastTitle, { color: theme.text }]}>{podcastResult.title}</Text>
          <Text style={[styles.podcastDuration, { color: theme.textSecondary }]}>时长: {podcastResult.duration}</Text>
          <Text style={[styles.podcastScript, { color: theme.text }]}>{podcastResult.script}</Text>
        </View>
        
        {podcastResult.topics_covered.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>涵盖主题</Text>
            <View style={styles.topicTags}>
              {podcastResult.topics_covered.map((topic, i) => (
                <View key={i} style={[styles.topicTag, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.topicTagText, { color: colors.primary }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    )
  }

  const renderInspire = () => {
    if (!inspireResult) return null
    
    return (
      <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.insightTitle, { color: theme.text }]}>✨ 灵感推荐</Text>
        <Text style={[styles.insightSubtitle, { color: theme.textSecondary }]}>
          基于你的知识体系发现新想法
        </Text>
        
        {inspireResult.inspirations.map((insp, i) => (
          <View key={i} style={[styles.inspCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inspTitle, { color: theme.text }]}>{insp.title}</Text>
            <Text style={[styles.inspDesc, { color: theme.textSecondary }]}>{insp.description}</Text>
            <View style={styles.inspMeta}>
              <Text style={[styles.inspSource, { color: colors.primary }]}>{insp.source}</Text>
              <Text style={[styles.inspRelevance, { color: theme.textSecondary }]}>相关度 {insp.relevance}%</Text>
            </View>
          </View>
        ))}
        
        {inspireResult.action_suggestions.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={[styles.insightsTitle, { color: theme.text }]}>💡 行动建议</Text>
            {inspireResult.action_suggestions.map((s, i) => (
              <Text key={i} style={[styles.insightItem, { color: theme.textSecondary }]}>• {s}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>知识洞察</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            探索你的知识体系
          </Text>
        </View>

        <View style={styles.cardsGrid}>
          {insightCards.map((card) => (
            <TouchableOpacity
              key={card.type}
              style={[
                styles.insightCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                activeInsight === card.type && { borderColor: card.color, borderWidth: 2 }
              ]}
              onPress={() => handleInsightPress(card.type)}
            >
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{card.title}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{card.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeInsight && (
          <View style={styles.contentSection}>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => setActiveInsight(null)}
            >
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>← 返回</Text>
            </TouchableOpacity>
            {renderInsightContent()}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: { padding: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
  subtitle: { fontSize: font.sizes.md, marginTop: spacing.xs },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  insightCard: {
    width: CARD_WIDTH,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardIcon: { fontSize: 32, marginBottom: spacing.sm },
  cardTitle: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, marginBottom: spacing.xs },
  cardSubtitle: { fontSize: font.sizes.xs },
  contentSection: { padding: spacing.xl },
  backBtn: { marginBottom: spacing.md },
  backBtnText: { fontSize: font.sizes.md },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, marginBottom: spacing.xs },
  insightSubtitle: { fontSize: font.sizes.sm, marginBottom: spacing.lg },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  loadingText: { marginTop: spacing.md, fontSize: font.sizes.md },
  errorContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  errorIcon: { fontSize: 48, marginBottom: spacing.md },
  errorText: { fontSize: font.sizes.md, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md },
  retryBtnText: { color: '#fff', fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  clusterCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  clusterHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm },
  clusterIcon: { fontSize: 20, marginRight: spacing.sm },
  clusterName: { flex: 1, fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  clusterCount: { fontSize: font.sizes.xs },
  clusterDesc: { fontSize: font.sizes.sm, marginBottom: spacing.sm },
  clusterKeywords: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  keywordTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  keywordText: { fontSize: font.sizes.xs },
  insightsSection: { marginTop: spacing.lg },
  insightsTitle: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, marginBottom: spacing.sm },
  insightItem: { fontSize: font.sizes.sm, lineHeight: 22, marginBottom: spacing.xs },
  coverageCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg, alignItems: 'center' },
  coverageLabel: { fontSize: font.sizes.sm, marginBottom: spacing.xs },
  coverageValue: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
  coverageBar: { width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginTop: spacing.sm },
  coverageFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  gapCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  gapTopic: { fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  gapPriority: { fontSize: font.sizes.xs, fontWeight: font.weights.medium },
  gapReason: { fontSize: font.sizes.sm, marginBottom: spacing.xs },
  gapSuggestion: { fontSize: font.sizes.sm },
  periodTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  periodTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: '#E5E7EB' },
  periodTabText: { color: '#fff', fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  themesSection: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, marginBottom: spacing.sm },
  themeRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs },
  themeName: { flex: 1, fontSize: font.sizes.sm },
  themeTrend: { fontSize: font.sizes.xs, fontWeight: font.weights.medium },
  themeCount: { fontSize: font.sizes.xs, marginLeft: spacing.sm },
  eventsSection: { marginBottom: spacing.lg },
  eventItem: { flexDirection: 'row', marginBottom: spacing.md },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: spacing.sm, marginRight: spacing.sm },
  eventCard: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  eventDate: { fontSize: font.sizes.xs, marginBottom: spacing.xs },
  eventTitle: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, marginBottom: spacing.xs },
  eventDesc: { fontSize: font.sizes.xs },
  progressCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'space-around' },
  progressItem: { alignItems: 'center' },
  progressValue: { fontSize: font.sizes.xl, fontWeight: font.weights.bold },
  progressLabel: { fontSize: font.sizes.xs, marginTop: spacing.xs },
  summaryText: { fontSize: font.sizes.md, lineHeight: 24, marginBottom: spacing.lg },
  topicsSection: { marginBottom: spacing.lg },
  topicCard: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  topicName: { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, marginBottom: spacing.xs },
  topicInsight: { fontSize: font.sizes.xs },
  podcastCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg },
  podcastTitle: { fontSize: font.sizes.lg, fontWeight: font.weights.bold, marginBottom: spacing.xs },
  podcastDuration: { fontSize: font.sizes.xs, marginBottom: spacing.md },
  podcastScript: { fontSize: font.sizes.md, lineHeight: 24 },
  topicTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  topicTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  topicTagText: { fontSize: font.sizes.xs },
  inspCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  inspTitle: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, marginBottom: spacing.xs },
  inspDesc: { fontSize: font.sizes.sm, marginBottom: spacing.sm },
  inspMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  inspSource: { fontSize: font.sizes.xs },
  inspRelevance: { fontSize: font.sizes.xs },
})
