import React, { useState, useCallback, useRef } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, useColorScheme, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView } from 'react-native'
import { Cell, CellType, AIOutputCellData, TextCellData, VoiceCellData } from '@/types/cell'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { useLLM } from '@/hooks/use-llm'
import { useNotebookStore } from '@/store/notebook-store'
import { useVoice } from '@/hooks/use-voice'

interface Props {
  notebookId: string
}

export default function NotebookEditor({ notebookId }: Props) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light

  const { activeCells, addCell, updateCell, persistCell, deleteCell } = useNotebookStore()
  const { analyzeIntent } = useLLM()
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
          duration_ms: result.duration ?? 0 
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

      const outputCell = await addCell(notebookId, 'ai_output')
      updateCell(outputCell.id, {
        is_streaming: true,
        content: '',
      } as Partial<AIOutputCellData>)

      const result = await analyzeIntent(allContent)
      const fullContent = result.intent + 
        (result.action_items.length ? '\n\n**待办事项:**\n' + result.action_items.map(a => `- ${a.text}`).join('\n') : '') +
        (result.suggestions.length ? '\n\n**建议:**\n' + result.suggestions.map(s => `- ${s}`).join('\n') : '')

      updateCell(outputCell.id, {
        content: fullContent,
        is_streaming: false,
        structured: result,
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
      } as Partial<AIOutputCellData>)
      await persistCell({ ...outputCell, content: fullContent, structured: result } as Cell)
      setTimeout(() => scrollViewRef.current?.scrollToEnd(), 100)
    } catch (e: any) {
      console.error('AI process error:', e)
    } finally {
      setIsProcessing(false)
    }
  }, [activeCells, notebookId, analyzeIntent, addCell, updateCell, persistCell])

  const renderDocument = () => {
    const elements: React.ReactNode[] = []
    let keyIndex = 0
    
    activeCells.forEach((cell, index) => {
      const content = extractCellContent(cell)
      if (!content) return
      
      if (cell.type === 'ai_output') {
        elements.push(
          <View key={`cell-${keyIndex++}`} style={styles.aiBlock}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiIcon}>✨</Text>
              <Text style={styles.aiLabel}>AI 分析</Text>
            </View>
            <Text style={[styles.aiContent, { color: theme.text }]}>
              {content}
            </Text>
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
          
          <TouchableOpacity 
            style={[styles.aiBtn, (isProcessing || activeCells.length === 0) && styles.aiBtnDisabled]}
            onPress={handleAIProcess}
            disabled={isProcessing || activeCells.length === 0}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.aiBtnText}>✨ AI</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 录音弹窗 */}
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
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {isRecording ? '正在录音...' : '准备录音...'}
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
}

function extractCellContent(cell: Cell): string {
  switch (cell.type) {
    case 'text': return cell.content
    case 'voice': return cell.transcription ?? ''
    case 'ai_output': return cell.content
    default: return ''
  }
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
    marginBottom: spacing.sm,
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
  aiContent: {
    fontSize: font.sizes.md,
    lineHeight: 24,
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
  aiBtn: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  aiBtnDisabled: {
    opacity: 0.5,
  },
  aiBtnText: {
    color: '#fff',
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
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
    fontSize: font.sizes.xxl,
    fontWeight: font.weights.bold,
    marginBottom: spacing.sm,
  },
  transcriptionPreview: {
    fontSize: font.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: font.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    color: '#666',
    fontSize: font.sizes.md,
    fontWeight: font.weights.medium,
  },
  stopBtn: {
    backgroundColor: colors.primary,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
})
