import React from 'react'
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, ScrollView } from 'react-native'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { CheckCircle2, Circle, Clock, Lightbulb, ArrowRight, Settings } from 'lucide-react-native'

// 模拟待办数据
const TODOS = [
  { id: '1', text: '完成首页UI设计', source: '产品需求评审会议', due: '今天', completed: false },
  { id: '2', text: '整理用户调研笔记', source: '用户访谈录音', due: '明天', completed: false },
  { id: '3', text: '准备周会汇报材料', source: '周计划', due: '周五', completed: false },
]

const HIGHLIGHTS = [
  { id: '1', content: '关键洞察：用户最在意的是快速启动', source: '用户访谈录音' },
  { id: '2', content: '竞品分析：Craft 的交互设计值得参考', source: '竞品调研' },
]

const NEXT_ACTIONS = [
  { id: '1', text: '制定产品路线图', isAI: true },
  { id: '2', text: '联系设计团队确认视觉规范', isAI: false },
]

export default function TodosScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>待办事项</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Settings size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* 待办列表 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle2 size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>待办事项</Text>
            <Text style={[styles.sectionCount, { color: theme.textTertiary }]}>{TODOS.length}</Text>
          </View>

          {TODOS.map((todo) => (
            <TouchableOpacity 
              key={todo.id}
              style={[styles.todoItem, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
            >
              <Circle size={20} color={theme.textTertiary} />
              <View style={styles.todoContent}>
                <Text style={[styles.todoText, { color: theme.text }]}>{todo.text}</Text>
                <View style={styles.todoMeta}>
                  <Text style={[styles.todoSource, { color: theme.textSecondary }]}>
                    来自：{todo.source}
                  </Text>
                  <View style={[styles.dueBadge, { backgroundColor: todo.due === '今天' ? colors.primaryLight : theme.bgTertiary }]}>
                    <Clock size={10} color={todo.due === '今天' ? colors.primary : theme.textSecondary} />
                    <Text style={[styles.dueText, { color: todo.due === '今天' ? colors.primary : theme.textSecondary }]}>
                      {todo.due}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 已高亮重点 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lightbulb size={18} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>已高亮重点</Text>
          </View>

          {HIGHLIGHTS.map((item) => (
            <View 
              key={item.id}
              style={[styles.highlightItem, { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }]}
            >
              <Text style={[styles.highlightContent, { color: theme.text }]}>
                💡 "{item.content}"
              </Text>
              <Text style={[styles.highlightSource, { color: theme.textSecondary }]}>
                来自：{item.source}
              </Text>
            </View>
          ))}
        </View>

        {/* 下一步行动 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ArrowRight size={18} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>下一步行动</Text>
          </View>

          {NEXT_ACTIONS.map((action) => (
            <TouchableOpacity 
              key={action.id}
              style={[styles.actionItem, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
            >
              {action.isAI && (
                <View style={[styles.aiBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI建议</Text>
                </View>
              )}
              <Text style={[styles.actionText, { color: theme.text }]}>
                ➤ {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 占位提示 */}
        <View style={[styles.comingSoon, { backgroundColor: theme.bgTertiary }]}>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            🚧 待办功能完整版即将上线
          </Text>
          <Text style={[styles.comingSoonSub, { color: theme.textTertiary }]}>
            支持待办同步、提醒通知、重复任务
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['4'],
    paddingBottom: spacing['3'],
  },
  headerTitle: {
    fontSize: font.sizes['2xl'],
    fontWeight: '700',
  },
  settingsBtn: {
    padding: spacing['2'],
  },
  content: {
    paddingHorizontal: spacing['4'],
    paddingBottom: spacing['8'],
  },
  section: {
    marginBottom: spacing['6'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    marginBottom: spacing['3'],
  },
  sectionTitle: {
    fontSize: font.sizes.base,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: font.sizes.sm,
    marginLeft: 'auto',
  },
  // 待办项
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing['3'],
    padding: spacing['4'],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing['2'],
  },
  todoContent: {
    flex: 1,
    gap: spacing['1'],
  },
  todoText: {
    fontSize: font.sizes.base,
    fontWeight: '500',
    lineHeight: 22,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
  },
  todoSource: {
    fontSize: font.sizes.xs,
    flex: 1,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  dueText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // 高亮
  highlightItem: {
    padding: spacing['4'],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing['2'],
  },
  highlightContent: {
    fontSize: font.sizes.base,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: spacing['1'],
  },
  highlightSource: {
    fontSize: font.sizes.xs,
  },
  // 下一步行动
  actionItem: {
    padding: spacing['4'],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing['2'],
  },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing['2'],
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: spacing['2'],
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionText: {
    fontSize: font.sizes.base,
    fontWeight: '500',
  },
  // 即将上线
  comingSoon: {
    padding: spacing['6'],
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing['4'],
  },
  comingSoonText: {
    fontSize: font.sizes.base,
    fontWeight: '500',
    marginBottom: spacing['1'],
  },
  comingSoonSub: {
    fontSize: font.sizes.sm,
  },
})
