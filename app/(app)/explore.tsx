import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  useColorScheme, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { 
  Lightbulb, 
  Mic, 
  Compass,
  Sparkles,
  ArrowRight
} from 'lucide-react-native'

// 探索功能卡片
const EXPLORE_FEATURES = [
  {
    id: 'inspiration',
    icon: Lightbulb,
    title: '灵感激发',
    description: '基于你的笔记生成创意灵感',
    color: '#F59E0B',
  },
  {
    id: 'podcast',
    icon: Mic,
    title: '生成播客',
    description: '将笔记转换为播客脚本',
    color: '#EF4444',
  },
  {
    id: 'discover',
    icon: Compass,
    title: '主题发现',
    description: '发现笔记中的隐藏主题',
    color: '#10B981',
  },
]

export default function ExploreScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleFeaturePress = (featureId: string) => {
    setLoading(featureId)
    // 模拟加载
    setTimeout(() => {
      setLoading(null)
    }, 2000)
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>探索</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          发现笔记的更多可能性
        </Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* 功能卡片 */}
        <View style={styles.featuresGrid}>
          {EXPLORE_FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
              onPress={() => handleFeaturePress(feature.id)}
              disabled={loading === feature.id}
            >
              {loading === feature.id ? (
                <ActivityIndicator color={feature.color} style={styles.featureIcon} />
              ) : (
                <View style={[styles.iconContainer, { backgroundColor: feature.color + '15' }]}>
                  <feature.icon size={28} color={feature.color} />
                </View>
              )}
              <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
              <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{feature.description}</Text>
              <ArrowRight size={16} color={feature.color} style={styles.arrow} />
            </TouchableOpacity>
          ))}
        </View>

        {/* AI 推荐区域 */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={[styles.aiTitle, { color: theme.text }]}>AI 推荐</Text>
          </View>
          
          <View style={[styles.aiCard, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.aiCardTitle, { color: colors.primary }]}>
              💡 试试这个功能
            </Text>
            <Text style={[styles.aiCardText, { color: theme.text }]}>
              让 AI 分析你最近一周的笔记，发现潜在的知识关联
            </Text>
            <TouchableOpacity style={[styles.aiBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.aiBtnText}>开始分析</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 即将上线提示 */}
        <View style={[styles.comingSoon, { backgroundColor: theme.bgTertiary }]}>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            🚧 更多探索功能即将上线
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['6'],
    paddingBottom: spacing['4'],
  },
  title: {
    fontSize: font.sizes['2xl'],
    fontWeight: '700',
    marginBottom: spacing['1'],
  },
  subtitle: {
    fontSize: font.sizes.base,
  },
  content: {
    paddingHorizontal: spacing['4'],
    paddingBottom: spacing['8'],
  },
  featuresGrid: {
    gap: spacing['3'],
    marginBottom: spacing['6'],
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['4'],
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing['3'],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
  },
  featureTitle: {
    fontSize: font.sizes.base,
    fontWeight: '600',
    flex: 1,
  },
  featureDesc: {
    fontSize: font.sizes.sm,
    color: colors.icon,
    position: 'absolute',
    left: 76,
    top: 44,
  },
  arrow: {
    marginLeft: 'auto',
  },
  aiSection: {
    marginBottom: spacing['6'],
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    marginBottom: spacing['3'],
  },
  aiTitle: {
    fontSize: font.sizes.base,
    fontWeight: '600',
  },
  aiCard: {
    padding: spacing['5'],
    borderRadius: radius.lg,
  },
  aiCardTitle: {
    fontSize: font.sizes.sm,
    fontWeight: '600',
    marginBottom: spacing['2'],
  },
  aiCardText: {
    fontSize: font.sizes.base,
    lineHeight: 24,
    marginBottom: spacing['4'],
  },
  aiBtn: {
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['5'],
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  aiBtnText: {
    color: '#fff',
    fontSize: font.sizes.sm,
    fontWeight: '600',
  },
  comingSoon: {
    padding: spacing['4'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: font.sizes.sm,
  },
})
