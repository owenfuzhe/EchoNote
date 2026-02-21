import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator, ScrollView, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { colors, spacing, font, radius } from '@/components/ui/theme'
import { supabase } from '@/lib/supabase'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface TopicNode {
  id: string
  title: string
  tags: string[]
  cellCount: number
  x: number
  y: number
  size: number
}

interface TopicEdge {
  source: string
  target: string
  strength: number
}

interface TopicCluster {
  name: string
  count: number
  notebooks: TopicNode[]
}

export default function TopicMapScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [clusters, setClusters] = useState<TopicCluster[]>([])
  const [nodes, setNodes] = useState<TopicNode[]>([])
  const [edges, setEdges] = useState<TopicEdge[]>([])

  useEffect(() => {
    loadTopicMap()
  }, [])

  const loadTopicMap = async () => {
    setLoading(true)
    
    try {
      const { data: notebooks, error } = await supabase
        .from('notebooks')
        .select(`
          id, 
          title, 
          tags,
          cells(count)
        `)
        .order('updated_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      if (!notebooks || notebooks.length === 0) {
        setLoading(false)
        return
      }
      
      const topicNodes: TopicNode[] = notebooks.map((nb, i) => ({
        id: nb.id,
        title: nb.title || '未命名',
        tags: nb.tags || [],
        cellCount: (nb.cells as any)?.[0]?.count || 0,
        x: 0,
        y: 0,
        size: Math.max(40, Math.min(80, ((nb.cells as any)?.[0]?.count || 0) * 5 + 40))
      }))
      
      const allTags = notebooks.flatMap(nb => nb.tags || [])
      const tagCounts: Record<string, number> = {}
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
      
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag)
      
      const topicClusters: TopicCluster[] = topTags.map(tag => ({
        name: tag,
        count: tagCounts[tag],
        notebooks: topicNodes.filter(n => n.tags.includes(tag))
      }))
      
      const topicEdges: TopicEdge[] = []
      for (let i = 0; i < topicNodes.length; i++) {
        for (let j = i + 1; j < topicNodes.length; j++) {
          const commonTags = topicNodes[i].tags.filter(t => topicNodes[j].tags.includes(t))
          if (commonTags.length > 0) {
            topicEdges.push({
              source: topicNodes[i].id,
              target: topicNodes[j].id,
              strength: commonTags.length
            })
          }
        }
      }
      
      setNodes(topicNodes)
      setEdges(topicEdges)
      setClusters(topicClusters)
    } catch (e) {
      console.error('Load topic map error:', e)
    }
    
    setLoading(false)
  }

  const renderCluster = (cluster: TopicCluster, index: number) => {
    const hue = (index * 36) % 360
    const clusterColor = `hsl(${hue}, 70%, 60%)`
    const bgColor = `hsla(${hue}, 70%, 60%, 0.1)`
    
    return (
      <View key={cluster.name} style={[styles.clusterCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.clusterHeader, { backgroundColor: bgColor }]}>
          <Text style={[styles.clusterName, { color: clusterColor }]}>{cluster.name}</Text>
          <Text style={[styles.clusterCount, { color: theme.textSecondary }]}>{cluster.count} 篇</Text>
        </View>
        <View style={styles.clusterNotebooks}>
          {cluster.notebooks.slice(0, 3).map(nb => (
            <TouchableOpacity
              key={nb.id}
              style={[styles.notebookChip, { backgroundColor: theme.bg, borderColor: theme.border }]}
              onPress={() => router.push(`/(app)/notebook/${nb.id}`)}
            >
              <Text style={[styles.notebookChipText, { color: theme.text }]} numberOfLines={1}>
                {nb.title}
              </Text>
            </TouchableOpacity>
          ))}
          {cluster.notebooks.length > 3 && (
            <Text style={[styles.moreText, { color: theme.textSecondary }]}>
              +{cluster.notebooks.length - 3} 更多
            </Text>
          )}
        </View>
      </View>
    )
  }

  const renderOverview = () => (
    <View style={styles.overviewSection}>
      <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={styles.statIcon}>📚</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{nodes.length}</Text>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>笔记</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={styles.statIcon}>🏷️</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{clusters.length}</Text>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>主题</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={styles.statIcon}>🔗</Text>
        <Text style={[styles.statValue, { color: theme.text }]}>{edges.length}</Text>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>关联</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>🗺️ 主题地图</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>分析知识结构...</Text>
        </View>
      ) : nodes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>暂无数据</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            创建更多笔记以生成主题地图
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderOverview()}
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🔥 热门主题</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              基于标签聚类发现的知识主题
            </Text>
          </View>

          <View style={styles.clustersContainer}>
            {clusters.map((cluster, i) => renderCluster(cluster, i))}
          </View>

          {edges.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>🔗 笔记关联</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                发现 {edges.length} 对相关笔记
              </Text>
              <View style={styles.connectionsList}>
                {edges.slice(0, 5).map((edge, i) => {
                  const source = nodes.find(n => n.id === edge.source)
                  const target = nodes.find(n => n.id === edge.target)
                  if (!source || !target) return null
                  return (
                    <View key={i} style={[styles.connectionItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <TouchableOpacity onPress={() => router.push(`/(app)/notebook/${source.id}`)}>
                        <Text style={[styles.connectionNotebook, { color: theme.text }]} numberOfLines={1}>
                          {source.title}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.connectionArrow}>←→</Text>
                      <TouchableOpacity onPress={() => router.push(`/(app)/notebook/${target.id}`)}>
                        <Text style={[styles.connectionNotebook, { color: theme.text }]} numberOfLines={1}>
                          {target.title}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { width: 60 },
  backText: { fontSize: font.sizes.md },
  title: { fontSize: font.sizes.xl, fontWeight: font.weights.bold },
  placeholder: { width: 60 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: font.sizes.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, marginBottom: spacing.xs },
  emptyText: { fontSize: font.sizes.md },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  overviewSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  statCard: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 100,
  },
  statIcon: { fontSize: 24, marginBottom: spacing.xs },
  statValue: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
  statLabel: { fontSize: font.sizes.xs },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.md,
  },
  clustersContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  clusterCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clusterName: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  clusterCount: {
    fontSize: font.sizes.sm,
  },
  clusterNotebooks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  notebookChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  notebookChipText: {
    fontSize: font.sizes.xs,
  },
  moreText: {
    fontSize: font.sizes.xs,
    alignSelf: 'center',
  },
  connectionsList: {
    gap: spacing.sm,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  connectionNotebook: {
    fontSize: font.sizes.sm,
    flex: 1,
  },
  connectionArrow: {
    fontSize: font.sizes.sm,
    marginHorizontal: spacing.sm,
    color: colors.primary,
  },
})
