import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated'
import { VoiceCellData } from '@/types/cell'
import { colors, font, spacing, radius } from '@/components/ui/theme'
import { useVoice } from '@/hooks/use-voice'

interface Props {
  cell: VoiceCellData
  isDark: boolean
  onUpdate: (updates: Partial<VoiceCellData>) => void
}

export default function VoiceCell({ cell, isDark, onUpdate }: Props) {
  const theme = isDark ? colors.dark : colors.light
  const accent = colors.cell.voice
  const { state, durationMs, startRecording, stopRecording } = useVoice()
  const pulseScale = useSharedValue(1)

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }))

  const handleRecord = async () => {
    if (state === 'recording') {
      const result = await stopRecording()
      if (result) {
        onUpdate({ audio_uri: result.uri, transcription: result.transcription, is_transcribing: false })
      }
      pulseScale.value = 1
    } else {
      await startRecording()
      pulseScale.value = withRepeat(withTiming(1.2, { duration: 600 }), -1, true)
    }
  }

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <View style={styles.container}>
      <Animated.View style={pulseStyle}>
        <TouchableOpacity
          style={[styles.recordBtn, { backgroundColor: state === 'recording' ? '#EF4444' : accent }]}
          onPress={handleRecord}
          disabled={state === 'transcribing'}
        >
          {state === 'transcribing' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.recordIcon}>{state === 'recording' ? '⏹' : '🎙️'}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.info}>
        <Text style={[styles.status, { color: theme.textSecondary }]}>
          {state === 'recording'
            ? `Recording ${formatDuration(durationMs)}`
            : state === 'transcribing'
            ? 'Transcribing...'
            : cell.transcription
            ? `${formatDuration(cell.duration_ms)}`
            : 'Tap to record'}
        </Text>
        {cell.transcription ? (
          <Text style={[styles.transcription, { color: theme.text }]}>{cell.transcription}</Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  recordBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  recordIcon: { fontSize: 22 },
  info: { flex: 1 },
  status: { fontSize: font.sizes.sm, marginBottom: spacing.xs },
  transcription: { fontSize: font.sizes.md, lineHeight: font.sizes.md * 1.5 },
})
