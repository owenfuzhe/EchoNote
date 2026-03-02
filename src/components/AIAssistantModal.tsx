import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  useColorScheme, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { X, Send, Bot, Sparkles, Search, CheckCircle } from 'lucide-react-native'
import { useNotebookStore } from '@/store/notebook-store'

type TabType = 'home' | 'search' | 'todos'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function AIAssistantModal({ visible, onClose }: Props) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { notebooks } = useNotebookStore()

  const tabs = [
    { type: 'home' as TabType, icon: Bot, label: '助手' },
    { type: 'search' as TabType, icon: Search, label: '搜索' },
    { type: 'todos' as TabType, icon: CheckCircle, label: '待办' },
  ]

  const handleSend = async () => {
    if (!input.trim()) return
    setLoading(true)
    // 模拟 AI 响应
    setTimeout(() => {
      setLoading(false)
      setInput('')
    }, 1500)
  }

  const suggestions = [
    '总结一下这周的工作笔记',
    '找出所有关于产品的想法',
    '把语音笔记转成待办清单',
    '推荐今日优先处理的事项',
  ]

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.bg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.aiBadge, { backgroundColor: colors.primaryLight }]}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>AI 助手</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <KeyboardAvoidingView 
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {activeTab === 'home' && (
                <View style={styles.homeTab}>
                  <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                    有什么可以帮你的？
                  </Text>
                  <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
                    我可以帮你搜索笔记、总结内容、提取待办事项
                  </Text>

                  <View style={styles.suggestions}>
                    {suggestions.map((suggestion, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.suggestionChip, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                        onPress={() => setInput(suggestion)}
                      >
                        <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {loading && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                        AI 思考中...
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'search' && (
                <View style={styles.searchTab}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    搜索 {notebooks.length} 条笔记
                  </Text>
                </View>
              )}

              {activeTab === 'todos' && (
                <View style={styles.todosTab}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    从笔记中提取的待办事项
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputArea, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
              <View style={[styles.inputContainer, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="输入问题..."
                  placeholderTextColor={theme.textTertiary}
                  value={input}
                  onChangeText={setInput}
                  multiline
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
                  onPress={handleSend}
                  disabled={!input.trim() || loading}
                >
                  <Send size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>

          {/* Tab Bar */}
          <View style={[styles.tabBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.type}
                style={styles.tabBtn}
                onPress={() => setActiveTab(tab.type)}
              >
                <tab.icon 
                  size={22} 
                  color={activeTab === tab.type ? colors.primary : theme.textTertiary} 
                />
                <Text style={[
                  styles.tabLabel,
                  { color: activeTab === tab.type ? colors.primary : theme.textTertiary }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    height: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['4'],
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  aiBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: font.sizes.lg,
    fontWeight: '600',
  },
  closeBtn: {
    padding: spacing['2'],
  },
  content: {
    flex: 1,
    padding: spacing['4'],
  },
  homeTab: {
    alignItems: 'center',
    paddingVertical: spacing['8'],
  },
  welcomeTitle: {
    fontSize: font.sizes.xl,
    fontWeight: '600',
    marginBottom: spacing['2'],
  },
  welcomeSubtitle: {
    fontSize: font.sizes.base,
    textAlign: 'center',
    marginBottom: spacing['6'],
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing['2'],
    width: '100%',
  },
  suggestionChip: {
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: font.sizes.sm,
  },
  loadingContainer: {
    marginTop: spacing['8'],
    alignItems: 'center',
    gap: spacing['3'],
  },
  loadingText: {
    fontSize: font.sizes.sm,
  },
  searchTab: {
    paddingVertical: spacing['4'],
  },
  todosTab: {
    paddingVertical: spacing['4'],
  },
  sectionTitle: {
    fontSize: font.sizes.sm,
    fontWeight: '500',
  },
  inputArea: {
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
  },
  input: {
    flex: 1,
    fontSize: font.sizes.base,
    maxHeight: 80,
    paddingVertical: spacing['2'],
  },
  sendBtn: {
    padding: spacing['2'],
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing['2'],
    borderTopWidth: 1,
    paddingBottom: spacing['6'],
  },
  tabBtn: {
    alignItems: 'center',
    paddingVertical: spacing['2'],
    paddingHorizontal: spacing['4'],
  },
  tabLabel: {
    fontSize: font.sizes.xs,
    marginTop: 2,
  },
})
