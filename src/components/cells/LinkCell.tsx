import React, { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, Animated, Dimensions, ScrollView, TouchableWithoutFeedback, Platform, Linking } from 'react-native'
import { LinkCellData } from '@/types/cell'
import { colors, spacing, font, radius } from '@/components/ui/theme'
import { useLLM, AnalyzeResult } from '@/hooks/use-llm'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.4

interface Props {
  cell: LinkCellData
}

export default function LinkCell({ cell }: Props) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [aiResult, setAIResult] = useState<AnalyzeResult | null>(null)
  
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current
  const { analyze } = useLLM()

  const displayTitle = cell.title || cell.url
  const domain = (() => {
    try {
      return new URL(cell.url).hostname
    } catch {
      return cell.url
    }
  })()

  const handleOpenExternal = () => {
    if (Platform.OS === 'web') {
      window.open(cell.url, '_blank')
    } else {
      Linking.openURL(cell.url)
    }
  }

  const openSidebar = () => {
    setShowSidebar(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: SIDEBAR_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowSidebar(false))
  }

  const handleAI = async () => {
    if (aiResult) {
      openSidebar()
      return
    }

    setIsProcessing(true)
    try {
      const contentToAnalyze = cell.content || `链接: ${cell.url}\n标题: ${displayTitle}`
      const result = await analyze(contentToAnalyze)
      setAIResult(result)
      setIsProcessing(false)
      openSidebar()
    } catch (e) {
      console.error('AI analysis error:', e)
      setIsProcessing(false)
    }
  }

  const handleRegenerate = async () => {
    setAIResult(null)
    setIsProcessing(true)
    try {
      const contentToAnalyze = cell.content || `链接: ${cell.url}\n标题: ${displayTitle}`
      const result = await analyze(contentToAnalyze)
      setAIResult(result)
      setIsProcessing(false)
    } catch (e) {
      console.error('AI analysis error:', e)
      setIsProcessing(false)
    }
  }

  const renderSidebar = () => {
    if (!showSidebar) return null

    return (
      <>
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
        <Animated.View 
          style={[
            styles.sidebar, 
            { 
              backgroundColor: theme.surface,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={[styles.sidebarTitle, { color: theme.text }]}>✨ AI 分析</Text>
            <View style={styles.sidebarActions}>
              {aiResult && (
                <TouchableOpacity onPress={handleRegenerate} style={styles.regenerateBtn}>
                  <Text style={styles.regenerateText}>🔄</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={closeSidebar} style={styles.closeSidebarBtn}>
                <Text style={[styles.closeSidebarText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {aiResult ? (
              <>
                {aiResult.summary && (
                  <View style={styles.section}>
                    <Text style={[styles.summaryText, { color: theme.text }]}>
                      {aiResult.summary}
                    </Text>
                  </View>
                )}

                {aiResult.atomic_ideas && aiResult.atomic_ideas.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💭 想法拆解</Text>
                    {aiResult.atomic_ideas.map((idea, i) => (
                      <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemEmoji}>{getIdeaTypeEmoji(idea.type)}</Text>
                        <Text style={[styles.itemText, { color: theme.text }]}>{idea.content}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {aiResult.insights && aiResult.insights.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💡 洞察</Text>
                    {aiResult.insights.map((insight, i) => (
                      <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemEmoji}>{getInsightTypeEmoji(insight.type)}</Text>
                        <Text style={[styles.itemText, { color: theme.text }]}>{insight.content}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {aiResult.action_items && aiResult.action_items.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>✅ 待办事项</Text>
                    {aiResult.action_items.map((item, i) => (
                      <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemEmoji}>{getPriorityEmoji(item.priority)}</Text>
                        <Text style={[styles.itemText, { color: theme.text }]}>{item.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {aiResult.follow_up && (
                  <View style={[styles.followUpSection, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={styles.followUpLabel}>🤔 AI 追问</Text>
                    <Text style={[styles.followUpText, { color: theme.text }]}>
                      {aiResult.follow_up}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyAI}>
                <Text style={styles.emptyAIIcon}>🤖</Text>
                <Text style={[styles.emptyAIText, { color: theme.textSecondary }]}>
                  点击右上角 ✨ 按钮开始 AI 分析
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.linkIcon}>🔗</Text>
          <View style={styles.headerInfo}>
            <Text style={[styles.sourceLabel, { color: theme.textSecondary }]}>{domain}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.externalBtn} onPress={handleOpenExternal}>
            <Text style={styles.externalBtnText}>↗ 原文</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.aiBtn, isProcessing && styles.aiBtnProcessing]} 
            onPress={handleAI}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.aiBtnText}>✨</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {cell.content ? (
          <Text style={[styles.contentText, { color: theme.text }]}>
            {cell.content}
          </Text>
        ) : (
          <View style={styles.noContent}>
            <Text style={styles.noContentIcon}>📄</Text>
            <Text style={[styles.noContentText, { color: theme.textSecondary }]}>
              内容解析中或暂无内容
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleOpenExternal}>
              <Text style={styles.retryBtnText}>在浏览器中查看原文</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderSidebar()}
    </View>
  )
}

function getIdeaTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    fact: '📌',
    thought: '💭',
    question: '❓',
    plan: '📋',
    feeling: '❤️',
    commitment: '🤝',
  }
  return map[type] || '•'
}

function getInsightTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    pattern: '🔄',
    risk: '⚠️',
    opportunity: '🌟',
    gap: '🔍',
  }
  return map[type] || '•'
}

function getPriorityEmoji(priority: string): string {
  const map: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  }
  return map[priority] || '○'
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  linkIcon: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: font.sizes.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  externalBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#f3f4f6',
  },
  externalBtnText: {
    fontSize: font.sizes.sm,
    color: colors.primary,
  },
  aiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnProcessing: {
    opacity: 0.7,
  },
  aiBtnText: {
    fontSize: 18,
  },
  contentScroll: {
    maxHeight: 400,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  contentText: {
    fontSize: font.sizes.md,
    lineHeight: 28,
  },
  noContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  noContentIcon: {
    fontSize: 48,
  },
  noContentText: {
    fontSize: font.sizes.md,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sidebarTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
  },
  sidebarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  regenerateBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateText: {
    fontSize: 18,
  },
  closeSidebarBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSidebarText: {
    fontSize: 18,
  },
  sidebarContent: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  summaryText: {
    fontSize: font.sizes.lg,
    lineHeight: 28,
    fontWeight: font.weights.medium,
  },
  sectionTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemEmoji: {
    width: 28,
    fontSize: 16,
  },
  itemText: {
    flex: 1,
    fontSize: font.sizes.md,
    lineHeight: 24,
  },
  followUpSection: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  followUpLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  followUpText: {
    fontSize: font.sizes.md,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  emptyAI: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyAIIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyAIText: {
    fontSize: font.sizes.md,
    textAlign: 'center',
  },
})
