/**
 * Voice recording + transcription hook.
 * 
 * Web: Web Speech API (浏览器原生实时语音识别)
 * Native: expo-av + GLM ASR
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Platform } from 'react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useSettingsStore, loadProviderApiKey } from '@/store/settings-store'

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function useVoice() {
  const [state, setState] = useState<RecordingState>('idle')
  const [durationMs, setDurationMs] = useState(0)
  const [transcription, setTranscription] = useState<string | null>(null)
  const [audioUri, setAudioUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const recordingRef = useRef<Audio.Recording | null>(null)
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isRecordingRef = useRef(false)
  const finalTranscriptRef = useRef('')
  
  const { voiceLanguage, voiceTranscriptionProvider } = useSettingsStore()

  const isRecording = state === 'recording'

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (speechRecognitionRef.current) {
        isRecordingRef.current = false
        speechRecognitionRef.current.abort()
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setState('recording')
      setDurationMs(0)
      setTranscription('')
      setError(null)
      isRecordingRef.current = true
      finalTranscriptRef.current = ''
      
      if (Platform.OS === 'web') {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
        
        if (!SpeechRecognitionClass) {
          throw new Error('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器')
        }
        
        const recognition = new SpeechRecognitionClass()
        recognition.continuous = true
        recognition.interimResults = true
        
        // 根据设置选择语言
        if (voiceLanguage === 'zh') {
          recognition.lang = 'zh-CN'
        } else if (voiceLanguage === 'en') {
          recognition.lang = 'en-US'
        } else {
          recognition.lang = 'zh-CN' // 默认中文
        }
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (!isRecordingRef.current) return
          
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += transcript
            } else {
              interimTranscript += transcript
            }
          }
          
          setTranscription(finalTranscriptRef.current + interimTranscript)
        }
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'not-allowed') {
            setError('麦克风权限被拒绝，请允许浏览器访问麦克风')
            setState('error')
          } else if (event.error === 'no-speech') {
            // 没有检测到语音，忽略
          } else if (event.error === 'aborted') {
            // 用户中断，忽略
          } else {
            setError(`语音识别错误: ${event.error}`)
            setState('error')
          }
        }
        
        recognition.onend = () => {
          // 只有在还在录音状态时才重新开始
          if (isRecordingRef.current && speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.start()
            } catch (e) {
              // 忽略重复启动错误
            }
          }
        }
        
        speechRecognitionRef.current = recognition
        recognition.start()
        timerRef.current = setInterval(() => setDurationMs((d) => d + 100), 100)
      } else {
        // Native: 使用 expo-av
        await Audio.requestPermissionsAsync()
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        })
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        )
        recordingRef.current = recording
        timerRef.current = setInterval(() => setDurationMs((d) => d + 100), 100)
      }
    } catch (e: any) {
      console.error('Start recording error:', e)
      setError(e?.message || String(e))
      setState('error')
    }
  }, [voiceLanguage])

  const stopRecording = useCallback(async (): Promise<{ uri: string; transcription: string } | null> => {
    if (timerRef.current) clearInterval(timerRef.current)
    isRecordingRef.current = false
    
    try {
      let audioUri: string | null = null
      let finalTranscription = finalTranscriptRef.current || transcription || ''
      
      if (Platform.OS === 'web') {
        // Web: 停止 Web Speech API
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.abort()
          speechRecognitionRef.current = null
        }
        
        if (!finalTranscription) {
          setState('idle')
          return null
        }
        
        audioUri = 'web-speech://' + Date.now()
        setAudioUri(audioUri)
      } else {
        // Native: 停止 expo-av 录音
        if (!recordingRef.current) {
          setState('idle')
          return null
        }
        
        await recordingRef.current.stopAndUnloadAsync()
        audioUri = recordingRef.current.getURI()!
        setAudioUri(audioUri)
        recordingRef.current = null
        
        // Native 需要调用 API 转录
        if (voiceTranscriptionProvider === 'zai_asr') {
          setState('transcribing')
          const text = await transcribeWithGLM(audioUri)
          finalTranscription = text
          setTranscription(text)
        }
      }
      
      if (!finalTranscription) {
        setState('idle')
        return null
      }
      
      setState('done')
      return { uri: audioUri!, transcription: finalTranscription }
    } catch (e: any) {
      console.error('Stop recording error:', e)
      setError(e?.message || String(e))
      setState('error')
      return null
    }
  }, [transcription, voiceTranscriptionProvider])

  const reset = useCallback(() => {
    setState('idle')
    setTranscription(null)
    setAudioUri(null)
    setError(null)
    setDurationMs(0)
    isRecordingRef.current = false
    finalTranscriptRef.current = ''
  }, [])

  return { 
    state, 
    durationMs, 
    transcription, 
    audioUri, 
    error, 
    isRecording, 
    startRecording, 
    stopRecording, 
    reset 
  }
}

async function transcribeWithGLM(uri: string): Promise<string> {
  const apiKey = await loadProviderApiKey('zai')
  if (!apiKey) throw new Error('请在设置中添加智谱 AI (GLM) API Key')

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-asr-2512',
      file_base64: base64,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`转录失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.text
}
