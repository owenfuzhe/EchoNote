import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, useColorScheme, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView } from 'react-native'
import { Cell, CellType, AIOutputCellData, TextCellData, VoiceCellData, LinkCellData } from '@/types/cell'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { useLLM, AnalyzeResult } from '@/hooks/use-llm'
import { useNotebookStore } from '@/store/notebook-store'
import { useVoice } from '@/hooks/use-voice'
import { LinkCell } from '@/components/cells'

interface Props {
  notebookId: string
  onAIResult?: (result: AnalyzeResult) => void
}

export interface NotebookEditorRef {
  triggerAI: () => void
  isProcessing: boolean
}

const NotebookEditor = forwardRef<NotebookEditorRef, Props>(({ notebookId, onAIResult }, ref) => {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light

  const { activeCells, addCell, updateCell, persistCell } = useNotebookStore()
  const { analyze } = useLLM()
  const { startRecording, stopRecording, isRecording, transcription, state, durationMs, error: voiceError } = useVoice()
  
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRecordingModal, setShowRecordingModal] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  const handleAddText = useCallback(async () => {
    if (!textInput.trim()) return
    try {
      const cell = await addCell(notebookId, 'text')
      updateCell(cell.id, { content: textInput.trim() } as Partial<TextCellData>)
      await persistCell({ ...cell, content: textInput.trim() } as Cell)
      setTextInput('')
      setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100)
    } catch (e) {
      console.error('Add text error:', e)
    }
  }, [textInput, notebookId, addCell, updateCell, persistCell])

  const handleStartRecording = useCallback(async () => {
    setRecordingError(null)
    try {
      setShowRecordingModal(true)
      await startRecording()
    } catch (e: any) {
      setShowRecordingModal(false)
      const errorMsg = e?.name === 'NotFoundError' 
        ? '找不到麦克风设备，请检查电脑是否有麦克风'
        : e?.name === 'NotAllowedError'
        ? '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风'
        : e?.message || '录音启动失败'
      setRecordingError(errorMsg)
      console.error('Recording error:', e)
    }
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording()
    setShowRecordingModal(false)
    if (result?.transcription) {
      try {
        const cell = await addCell(notebookId, 'voice')
        updateCell(cell.id, { 
          transcription: result.transcription, 
          duration_ms: 0 
        } as Partial<VoiceCellData>)
        await persistCell({ ...cell, transcription: result.transcription } as Cell)
        setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100)
      } catch (e) {
        console.error('Add voice cell error:', e)
      }
    }
  }, [stopRecording, notebookId, addCell, updateCell, persistCell])

  const handleCancelRecording = useCallback(async () => {
    await stopRecording()
    setShowRecordingModal(false)
  }, [stopRecording])

  const handleAIProcess = useCallback(async () => {
    if (activeCells.length === 0) return
    setIsProcessing(true)
    
    try {
      const allContent = activeCells
        .map(cell => extractCellContent(cell))
        .filter(Boolean)
        .join('\n\n')
      
      if (!allContent) return

      const result: AnalyzeResult = await analyze(allContent)
      
      const formattedContent = formatAnalyzeResult(result)

      const outputCell = await addCell(notebookId, 'ai_output')
      updateCell(outputCell.id, {
        content: formattedContent,
        is_streaming: false,
        structured: result as any,
        provider: 'zai',
        model: 'glm-5',
      } as any)
      await persistCell({ ...outputCell, content: formattedContent, structured: result as any } as any)
      
      if (onAIResult) {
        onAIResult(result)
      }
      
      setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100)
    } catch (e: any) {
      console.error('AI process error:', e)
    } finally {
      setIsProcessing(false)
    }
  }, [activeCells, notebookId, analyze, addCell, updateCell, persistCell, onAIResult])

  useImperativeHandle(ref, () => ({
    triggerAI: handleAIProcess,
    get isProcessing() { return isProcessing }
  }), [handleAIProcess, isProcessing])

  const renderDocument = () => {
    const elements: React.ReactNode[] = []
    let keyIndex = 0
    
    activeCells.forEach((cell) => {
      if (cell.type === 'link') {
        elements.push(
          <View key={`cell-${keyIndex++}`} style={styles.linkCellWrap}>
            <LinkCell cell={cell as LinkCellData} />
          </View>
        )
        elements.push(<View key={`divider-${keyIndex++}`} style={styles.divider} />)
        return
      }
      
      const content = extractCellContent(cell)
      if (!content) return
      
      if (cell.type === 'ai_output') {
        const structured = cell.structured as any
        elements.push(
          <View key={`cell-${keyIndex++}`} style={styles.aiBlock}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiIcon}>✨</Text>
              <Text style={styles.aiLabel}>AI 分析</Text>
            </View>
            
            {structured ? (
              <>
                {structured.summary && (
                  <Text style={[styles.aiSummary, { color: theme.text }]}>
                    {structured.summary}
                  </Text>
                )}
                
                {structured.atomic_ideas && structured.atomic_ideas.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💭 想法拆解</Text>
                    {(structured.atomic_ideas as any[]).map((idea: any, i: number) => (
                      <View key={i} style={styles.ideaRow}>
                        <Text style={styles.ideaType}>{getIdeaTypeEmoji(idea.type)}</Text>
                        <Text style={[styles.ideaContent, { color: theme.text }]}>{idea.content}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {structured.insights && structured.insights.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💡 洞察</Text>
                    {(structured.insights as any[]).map((insight: any, i: number) => (
                      <View key={i} style={styles.insightRow}>
                        <Text style={styles.insightType}>{getInsightTypeEmoji(insight.type)}</Text>
                        <Text style={[styles.insightContent, { color: theme.text }]}>{insight.content}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {structured.action_items && structured.action_items.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>✅ 待办事项</Text>
                    {(structured.action_items as any[]).map((item: any, i: number) => (
                      <View key={i} style={styles.actionRow}>
                        <Text style={styles.actionPriority}>{getPriorityEmoji(item.priority)}</Text>
                        <Text style={[styles.actionContent, { color: theme.text }]}>{item.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {structured.follow_up && (
                  <View style={styles.followUpSection}>
                    <Text style={styles.followUpLabel}>🤔 AI 追问</Text>
                    <Text style={[styles.followUpText, { color: theme.text }]}>
                      {structured.follow_up}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.aiContent, { color: theme.text }]}>{content}</Text>
            )}
          </View>
        )
        elements.push(<View key={`divider-${keyIndex++}`} style={styles.divider} />)
      } else {
        elements.push(
          <Text key={`text-${keyIndex++}`} style={[styles.paragraph, { color: theme.text }]}>
            {content}
          </Text>
        )
      }
    })
    
    return elements
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {activeCells.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              开始记录你的想法...
            </Text>
          </View>
        ) : (
          <View style={styles.document}>
            {renderDocument()}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TextInput
          ref={inputRef}
          style={[styles.textInput, { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border }]}
          value={textInput}
          onChangeText={setTextInput}
          placeholder="输入内容..."
          placeholderTextColor={theme.textTertiary}
          multiline
        />
        
        <View style={styles.toolbar}>
          <TouchableOpacity 
            style={[styles.toolBtn, textInput.trim() && { backgroundColor: colors.primary }]}
            onPress={handleAddText}
            disabled={!textInput.trim()}
          >
            <Text style={[styles.toolBtnText, !textInput.trim() && { color: theme.textTertiary }]}>
              发送
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolBtn, isRecording && styles.recordingBtn]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <Text style={styles.toolBtnText}>{isRecording ? '⏹️' : '🎙️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showRecordingModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            {state === 'error' || voiceError ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.error }]}>❌ 录音失败</Text>
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                  {voiceError || recordingError || '未知错误'}
                </Text>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.stopBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowRecordingModal(false)
                    setRecordingError(null)
                  }}
                >
                  <Text style={styles.stopBtnText}>关闭</Text>
                </TouchableOpacity>
              </>
            ) : state === 'transcribing' ? (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>正在转录...</Text>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
                <Text style={[styles.duration, { color: theme.text }]}>
                  {formatDuration(durationMs)}
                </Text>
              </>
            ) : state === 'idle' ? (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>准备录音...</Text>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
                <Text style={[styles.duration, { color: theme.textSecondary }]}>
                  正在请求麦克风权限
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  正在录音...
                </Text>
                
                <View style={styles.recordingIndicator}>
                  <View style={[styles.wave, { backgroundColor: colors.primary }]} />
                  <View style={[styles.wave, { backgroundColor: colors.primary }, styles.wave2]} />
                  <View style={[styles.wave, { backgroundColor: colors.primary }, styles.wave3]} />
                </View>
                
                <Text style={[styles.duration, { color: theme.text }]}>
                  {formatDuration(durationMs)}
                </Text>
                
                {transcription && (
                  <Text style={[styles.transcriptionPreview, { color: theme.textSecondary }]}>
                    {transcription}
                  </Text>
                )}
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={handleCancelRecording}
                  >
                    <Text style={styles.cancelBtnText}>取消</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.stopBtn, { backgroundColor: colors.cell.voice }]}
                    onPress={handleStopRecording}
                  >
                    <Text style={styles.stopBtnText}>完成</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
})

NotebookEditor.displayName = 'NotebookEditor'

export default NotebookEditor

function extractCellContent(cell: Cell): string {
  switch (cell.type) {
    case 'text': return cell.content
    case 'voice': return cell.transcription ?? ''
    case 'ai_output': return cell.content
    case 'link': return cell.title || cell.url
    default: return ''
  }
}

function formatAnalyzeResult(result: AnalyzeResult): string {
  let content = ''
  
  if (result.summary) {
    content += `**摘要:** ${result.summary}\n\n`
  }
  
  if (result.atomic_ideas && result.atomic_ideas.length > 0) {
    content += `**想法拆解:**\n`
    result.atomic_ideas.forEach(idea => {
      content += `- ${getIdeaTypeEmoji(idea.type)} ${idea.content}\n`
    })
    content += '\n'
  }
  
  if (result.insights && result.insights.length > 0) {
    content += `**洞察:**\n`
    result.insights.forEach(insight => {
      content += `- ${getInsightTypeEmoji(insight.type)} ${insight.content}\n`
    })
    content += '\n'
  }
  
  if (result.action_items && result.action_items.length > 0) {
    content += `**待办事项:**\n`
    result.action_items.forEach(item => {
      content += `- ${getPriorityEmoji(item.priority)} ${item.text}\n`
    })
    content += '\n'
  }
  
  if (result.follow_up) {
    content += `**AI 追问:** ${result.follow_up}`
  }
  
  return content.trim()
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { 
    flexGrow: 1,
    padding: spacing.lg,
  },
  document: {
    flex: 1,
  },
  paragraph: {
    fontSize: font.sizes.lg,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  linkCellWrap: {
    marginVertical: spacing.sm,
  },
  aiBlock: {
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  aiIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  aiLabel: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    color: colors.primary,
  },
  aiSummary: {
    fontSize: font.sizes.md,
    lineHeight: 24,
    fontWeight: font.weights.medium,
    marginBottom: spacing.md,
  },
  aiContent: {
    fontSize: font.sizes.md,
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: font.sizes.sm,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  ideaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  ideaType: {
    width: 24,
    fontSize: 14,
  },
  ideaContent: {
    flex: 1,
    fontSize: font.sizes.sm,
    lineHeight: 20,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  insightType: {
    width: 24,
    fontSize: 14,
  },
  insightContent: {
    flex: 1,
    fontSize: font.sizes.sm,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  actionPriority: {
    width: 24,
    fontSize: 14,
  },
  actionContent: {
    flex: 1,
    fontSize: font.sizes.sm,
    lineHeight: 20,
  },
  followUpSection: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  followUpLabel: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  followUpText: {
    fontSize: font.sizes.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: font.sizes.md,
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: font.sizes.md,
    maxHeight: 100,
    minHeight: 44,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnText: {
    fontSize: 16,
    color: '#333',
  },
  recordingBtn: {
    backgroundColor: colors.cell.voice,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.lg,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginBottom: spacing.md,
  },
  wave: {
    width: 8,
    height: 20,
    borderRadius: 4,
  },
  wave2: {
    height: 30,
  },
  wave3: {
    height: 25,
  },
  duration: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    marginBottom: spacing.md,
  },
  transcriptionPreview: {
    fontSize: font.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    fontSize: font.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: font.weights.medium,
  },
  stopBtn: {
    backgroundColor: colors.primary,
  },
  stopBtnText: {
    color: '#fff',
    fontWeight: font.weights.semibold,
  },
})
