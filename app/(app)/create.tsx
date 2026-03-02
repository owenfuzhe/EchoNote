import React, { useState, useCallback, useEffect, useRef } from 'react'
import { 
  View, Text, TouchableOpacity, StyleSheet, useColorScheme, 
  Modal, Animated, Dimensions, TextInput, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { 
  Mic, 
  SquarePen, 
  CircleStop, 
  X, 
  Check,
  Plus,
  FileText,
  Video,
  Link2,
  Image as ImageIcon
} from 'lucide-react-native'
import { useVoice } from '@/hooks/use-voice'
import { useNotebookStore } from '@/store/notebook-store'
import { Cell } from '@/types/cell'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85

export default function CreateScreen() {
  const router = useRouter()
  const { type } = useLocalSearchParams<{ type?: string }>()
  const [mode, setMode] = useState<'select' | 'voice' | 'text'>('select')
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    if (type === 'voice') {
      setMode('voice')
    } else if (type === 'text') {
      setMode('text')
    }
  }, [type])

  const handleClose = () => {
    router.back()
  }

  const handleVoiceComplete = () => {
    router.back()
  }

  const handleTextComplete = () => {
    router.back()
  }

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: '#fff' }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'select' && '新建笔记'}
              {mode === 'voice' && '语音笔记'}
              {mode === 'text' && '文字笔记'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {mode === 'select' && (
            <SelectMode 
              onVoice={() => setMode('voice')} 
              onText={() => setMode('text')}
              onMore={() => setShowMore(true)}
            />
          )}
          {mode === 'voice' && (
            <VoiceRecorder onComplete={handleVoiceComplete} onCancel={handleClose} />
          )}
          {mode === 'text' && (
            <TextEditor onComplete={handleTextComplete} onCancel={handleClose} />
          )}
        </View>
      </View>

      {/* 更多选项弹窗 */}
      <MoreOptionsModal 
        visible={showMore} 
        onClose={() => setShowMore(false)} 
      />
    </Modal>
  )
}

// 选择模式界面
function SelectMode({ 
  onVoice, 
  onText,
  onMore 
}: { 
  onVoice: () => void
  onText: () => void
  onMore: () => void
}) {
  return (
    <View style={styles.selectContainer}>
      <TouchableOpacity style={styles.modeBtn} onPress={onVoice}>
        <View style={[styles.modeIcon, { backgroundColor: colors.recording + '15' }]}>
          <Mic size={32} color={colors.recording} />
        </View>
        <Text style={styles.modeLabel}>语音笔记</Text>
        <Text style={styles.modeDesc}>快速记录想法，AI自动转录</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.modeBtn} onPress={onText}>
        <View style={[styles.modeIcon, { backgroundColor: colors.primary + '15' }]}>
          <SquarePen size={32} color={colors.primary} />
        </View>
        <Text style={styles.modeLabel}>文字笔记</Text>
        <Text style={styles.modeDesc}>直接输入文字内容</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.moreBtn} onPress={onMore}>
        <View style={styles.moreIconContainer}>
          <Plus size={20} color={colors.icon} />
        </View>
        <Text style={styles.moreText}>更多导入方式</Text>
      </TouchableOpacity>
    </View>
  )
}

// 语音录音界面
function VoiceRecorder({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: () => void
  onCancel: () => void 
}) {
  const scheme = useColorScheme()
  const theme = scheme === 'dark' ? colors.dark : colors.light
  const { startRecording, stopRecording, isRecording, transcription, state, durationMs, error } = useVoice()
  const [pulseAnim] = useState(new Animated.Value(1))
  const { addCell, updateCell, persistCell } = useNotebookStore()
  const [savedTranscription, setSavedTranscription] = useState('')

  // 脉冲动画
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isRecording])

  const handleRecordToggle = async () => {
    if (isRecording) {
      // 暂停/继续逻辑
      const result = await stopRecording()
      if (result?.transcription) {
        setSavedTranscription(result.transcription)
      }
    } else {
      await startRecording()
    }
  }

  const handleComplete = async () => {
    if (!savedTranscription && !transcription) {
      onCancel()
      return
    }
    
    const finalText = savedTranscription || transcription || ''
    
    // 创建新笔记
    const notebookId = 'temp-' + Date.now()
    
    // TODO: 创建笔记逻辑
    onComplete()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <View style={styles.voiceContainer}>
      {/* 时长显示 */}
      <View style={styles.durationContainer}>
        <Text style={[styles.durationText, { color: theme.text }]}>
          {formatDuration(durationMs)}
        </Text>
        {state === 'recording' && (
          <Text style={[styles.recordingStatus, { color: colors.recording }]}>● 录音中</Text>
        )}
      </View>

      {/* 麦克风按钮 */}
      <View style={styles.micContainer}>
        {isRecording && (
          <Animated.View 
            style={[
              styles.pulseRing,
              { 
                backgroundColor: colors.recordingActive + '30',
                transform: [{ scale: pulseAnim }]
              }
            ]} 
          />
        )}
        <TouchableOpacity 
          style={[
            styles.micButton,
            { 
              backgroundColor: isRecording ? colors.recordingActive : colors.icon,
            }
          ]}
          onPress={handleRecordToggle}
        >
          {isRecording ? (
            <CircleStop size={32} color="#fff" />
          ) : (
            <Mic size={32} color="#fff" />
          )}
        </TouchableOpacity>
        <Text style={[styles.micLabel, { color: theme.textSecondary }]}>
          {isRecording ? '点击暂停' : savedTranscription ? '继续录音' : '点击录音'}
        </Text>
      </View>

      {/* 实时转录预览 */}
      {(transcription || savedTranscription) && (
        <View style={[styles.transcriptionContainer, { backgroundColor: theme.bgSecondary }]}>
          <Text style={[styles.transcriptionLabel, { color: theme.textSecondary }]}>
            {isRecording ? '实时转录：' : '转录内容：'}
          </Text>
          <ScrollView style={styles.transcriptionScroll}>
            <Text style={[styles.transcriptionText, { color: theme.text }]}>
              {transcription || savedTranscription}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* 底部操作 */}
      <View style={styles.voiceActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.cancelBtn, { borderColor: theme.border }]} 
          onPress={onCancel}
        >
          <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>取消</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionBtn, 
            styles.completeBtn,
            (!transcription && !savedTranscription) && { opacity: 0.5 }
          ]} 
          onPress={handleComplete}
          disabled={!transcription && !savedTranscription}
        >
          <Text style={styles.completeBtnText}>完成</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// 文字编辑器
function TextEditor({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: () => void
  onCancel: () => void 
}) {
  const scheme = useColorScheme()
  const theme = scheme === 'dark' ? colors.dark : colors.light
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      onCancel()
      return
    }
    // TODO: 保存逻辑
    onComplete()
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.textContainer}>
        <TextInput
          style={[styles.titleInput, { color: theme.text }]} 
          placeholder="标题"
          placeholderTextColor={theme.textTertiary}
          value={title}
          onChangeText={setTitle}
        />
        
        <TextInput
          style={[styles.contentInput, { color: theme.text }]}
          placeholder="开始输入内容..."
          placeholderTextColor={theme.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.textActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.cancelBtn, { borderColor: theme.border }]} 
            onPress={onCancel}
          >
            <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>取消</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionBtn, 
              styles.completeBtn,
              (!title.trim() && !content.trim()) && { opacity: 0.5 }
            ]} 
            onPress={handleSave}
            disabled={!title.trim() && !content.trim()}
          >
            <Text style={styles.completeBtnText}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

// 更多选项弹窗
function MoreOptionsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const options = [
    { icon: FileText, label: '导入 PDF', color: '#F59E0B' },
    { icon: Video, label: '导入视频', color: '#EF4444' },
    { icon: Mic, label: '导入音频', color: '#10B981' },
    { icon: Link2, label: '粘贴链接', color: '#3B82F6' },
    { icon: ImageIcon, label: '选择图片', color: '#8B5CF6' },
  ]

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.moreOverlay} onPress={onClose}>
        <View style={[styles.moreModal, { backgroundColor: '#fff' }]}>
          <Text style={styles.moreTitle}>更多导入方式</Text>
          
          {options.map((option, idx) => (
            <TouchableOpacity key={idx} style={styles.moreOption}>
              <View style={[styles.moreOptionIcon, { backgroundColor: option.color + '15' }]}>
                <option.icon size={20} color={option.color} />
              </View>
              <Text style={styles.moreOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
          
          <View style={[styles.comingSoon, { backgroundColor: '#F3F4F6' }]}>
            <Text style={styles.comingSoonText}>🚧 即将上线</Text>
          </View>
        </View>
      </TouchableOpacity>
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
    height: MODAL_HEIGHT,
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
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: font.sizes.lg,
    fontWeight: '600',
    color: '#111827',
  },
  closeBtn: {
    padding: spacing['2'],
  },

  // 选择模式
  selectContainer: {
    flex: 1,
    padding: spacing['6'],
    gap: spacing['4'],
  },
  modeBtn: {
    alignItems: 'center',
    padding: spacing['6'],
    borderRadius: radius.lg,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['4'],
  },
  modeLabel: {
    fontSize: font.sizes.lg,
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing['1'],
  },
  modeDesc: {
    fontSize: font.sizes.sm,
    color: '#6B7280',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['4'],
  },
  moreIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: font.sizes.base,
    color: '#4B5563',
  },

  // 语音录制
  voiceContainer: {
    flex: 1,
    padding: spacing['6'],
  },
  durationContainer: {
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  durationText: {
    fontSize: 48,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  recordingStatus: {
    fontSize: font.sizes.sm,
    fontWeight: '500',
    marginTop: spacing['2'],
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: spacing['8'],
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  micLabel: {
    fontSize: font.sizes.base,
    marginTop: spacing['4'],
  },
  transcriptionContainer: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing['4'],
    marginBottom: spacing['4'],
  },
  transcriptionLabel: {
    fontSize: font.sizes.sm,
    marginBottom: spacing['2'],
  },
  transcriptionScroll: {
    flex: 1,
  },
  transcriptionText: {
    fontSize: font.sizes.base,
    lineHeight: 24,
  },
  voiceActions: {
    flexDirection: 'row',
    gap: spacing['3'],
  },

  // 文字编辑
  textContainer: {
    flex: 1,
    padding: spacing['4'],
  },
  titleInput: {
    fontSize: font.sizes.xl,
    fontWeight: '600',
    paddingVertical: spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: spacing['4'],
  },
  contentInput: {
    flex: 1,
    fontSize: font.sizes.base,
    lineHeight: 24,
    paddingVertical: spacing['2'],
  },
  textActions: {
    flexDirection: 'row',
    gap: spacing['3'],
    paddingVertical: spacing['4'],
  },

  // 通用按钮
  actionBtn: {
    flex: 1,
    paddingVertical: spacing['4'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: font.sizes.base,
    fontWeight: '500',
  },
  completeBtn: {
    backgroundColor: colors.primary,
  },
  completeBtnText: {
    fontSize: font.sizes.base,
    fontWeight: '600',
    color: '#fff',
  },

  // 更多选项
  moreOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moreModal: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing['6'],
    paddingBottom: spacing['8'],
  },
  moreTitle: {
    fontSize: font.sizes.lg,
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing['6'],
    textAlign: 'center',
  },
  moreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['4'],
    paddingVertical: spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  moreOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOptionText: {
    fontSize: font.sizes.base,
    color: '#374151',
  },
  comingSoon: {
    marginTop: spacing['4'],
    padding: spacing['4'],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: font.sizes.sm,
    color: '#6B7280',
  },
})
