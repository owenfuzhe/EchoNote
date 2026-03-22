import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';
import { Infinity, Mic, Sparkles, X } from 'lucide-react-native';
import { chat } from '../services/bailian-chat';
import { voiceCleanTranscript } from '../services/ai-actions';

interface VoiceCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateNote: (text: string) => void | Promise<void>;
  onAskAI: (text: string) => void;
}

type SpeechResultEvent = { results?: Array<{ transcript?: string }> };
type SpeechVolumeEvent = { value: number };
type SpeechErrorEvent = { message?: string };
type PermissionResponseLike = { granted: boolean };

type SpeechModuleLike = {
  requestPermissionsAsync?: () => Promise<PermissionResponseLike>;
  requestMicrophonePermissionsAsync?: () => Promise<PermissionResponseLike>;
  requestSpeechRecognizerPermissionsAsync?: () => Promise<PermissionResponseLike>;
  getPermissionsAsync?: () => Promise<PermissionResponseLike>;
  isRecognitionAvailable?: () => boolean | Promise<boolean>;
  supportsOnDeviceRecognition?: () => boolean | Promise<boolean>;
  getStateAsync?: () => Promise<string>;
  abort?: () => void;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  addListener?: (eventName: string, listener: (event: any) => void) => { remove?: () => void };
};

function fallbackRefine(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[，,]{2,}/g, '，')
    .replace(/[。\.]{2,}/g, '。')
    .trim();
}

function getNativeSpeechModule(): SpeechModuleLike | null {
  try {
    const pkg = require('expo-speech-recognition') as { ExpoSpeechRecognitionModule?: SpeechModuleLike };
    const mod = pkg?.ExpoSpeechRecognitionModule;
    if (mod && typeof mod.start === 'function' && typeof mod.stop === 'function') {
      return mod;
    }
  } catch {
    // Fall back to legacy proxy lookup below.
  }

  const mod = (NativeModulesProxy as Record<string, any>)?.ExpoSpeechRecognition;
  if (!mod) return null;
  if (typeof mod.start !== 'function' || typeof mod.stop !== 'function') return null;
  return mod as SpeechModuleLike;
}

export default function VoiceCapture({ isOpen, onClose, onGenerateNote, onAskAI }: VoiceCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [volume, setVolume] = useState(0);
  const [errorText, setErrorText] = useState('');

  const [speechModule, setSpeechModule] = useState<SpeechModuleLike | null>(null);
  const speechModuleRef = useRef<SpeechModuleLike | null>(null);
  const transcriptRef = useRef('');
  const refiningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mod = getNativeSpeechModule();
    speechModuleRef.current = mod;
    setSpeechModule(mod);
  }, []);

  const nativeMode = !!speechModule;

  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setIsRefining(false);
      setDraftText('');
      setManualInput('');
      setRefinedText('');
      setVolume(0);
      setErrorText('');
      transcriptRef.current = '';
      if (refiningTimerRef.current) {
        clearTimeout(refiningTimerRef.current);
        refiningTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const mod = speechModuleRef.current;
    if (!isOpen || !mod?.addListener) return;

    const resultSub = mod.addListener('result', (event: SpeechResultEvent) => {
      const text = event.results?.[0]?.transcript?.trim() || '';
      if (!text) return;
      transcriptRef.current = text;
      setDraftText(text);
    });

    const volumeSub = mod.addListener('volumechange', (event: SpeechVolumeEvent) => {
      setVolume(Math.max(0, Math.min(1, (event.value || 0) / 10)));
    });

    const errorSub = mod.addListener('error', (event: SpeechErrorEvent) => {
      setIsRecording(false);
      setErrorText(event.message || '语音识别失败，请重试');
    });

    const endSub = mod.addListener('end', () => {
      setIsRecording(false);
    });

    return () => {
      resultSub?.remove?.();
      volumeSub?.remove?.();
      errorSub?.remove?.();
      endSub?.remove?.();
    };
  }, [isOpen]);

  const outputText = useMemo(() => (refinedText.trim() || (nativeMode ? draftText.trim() : manualInput.trim())), [refinedText, draftText, manualInput, nativeMode]);
  const canSubmit = !!outputText && !isRefining && !isRecording;

  const refineText = async (sourceText: string) => {
    const source = sourceText.trim();
    if (!source) {
      setErrorText(nativeMode ? '没有识别到语音内容，请再说一次' : '请先输入内容');
      return;
    }

    setIsRefining(true);
    setErrorText('');

    try {
      try {
        const cleaned = await voiceCleanTranscript('语音输入', source);
        const polished = cleaned.cleanedText?.trim() || '';
        if (polished) {
          setRefinedText(polished);
          return;
        }
      } catch {
        const prompt = `请将以下语音草稿做轻量润色：\n- 保持原意，不要增加事实\n- 修复口语赘词、重复、标点和断句\n- 输出简洁自然的中文\n\n原文：\n${source}`;
        const resp = await chat([{ role: 'user', content: prompt }], {
          temperature: 0.2,
          maxTokens: 600,
          systemPrompt: '你是中文语音转写润色助手，只做轻量编辑，不扩写。',
        });
        const polished = (resp.content || '').trim();
        setRefinedText(polished || fallbackRefine(source));
        return;
      }

      setRefinedText(fallbackRefine(source));
    } catch {
      setRefinedText(fallbackRefine(source));
      setErrorText('已完成基础润色（AI 润色暂不可用）');
    } finally {
      setIsRefining(false);
    }
  };

  const startRecording = async () => {
    const mod = speechModuleRef.current;
    if (!mod || isRecording || isRefining) return;

    try {
      const permission =
        typeof mod.requestPermissionsAsync === 'function'
          ? await mod.requestPermissionsAsync()
          : Platform.OS === 'ios' && typeof mod.requestMicrophonePermissionsAsync === 'function'
            ? await mod.requestMicrophonePermissionsAsync()
            : await mod.getPermissionsAsync?.();

      if (!permission) {
        setErrorText('当前设备暂不支持语音识别，请稍后重试');
        return;
      }

      if (!permission.granted) {
        setErrorText('没有麦克风/语音识别权限，请在系统设置中开启');
        return;
      }

      const recognitionAvailable =
        typeof mod.isRecognitionAvailable === 'function'
          ? await Promise.resolve(mod.isRecognitionAvailable())
          : true;
      if (!recognitionAvailable) {
        setErrorText('当前设备未开启语音识别，请检查系统里的 Siri 与听写设置');
        return;
      }

      if (typeof mod.getStateAsync === 'function') {
        const currentState = await mod.getStateAsync();
        if (currentState && currentState !== 'inactive') {
          try {
            mod.abort?.();
          } catch {
            mod.stop();
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }

      const supportsOnDevice =
        typeof mod.supportsOnDeviceRecognition === 'function'
          ? await Promise.resolve(mod.supportsOnDeviceRecognition())
          : false;

      setErrorText('');
      setRefinedText('');
      setDraftText('');
      transcriptRef.current = '';
      setVolume(0);
      setIsRecording(true);

      mod.start({
        lang: 'zh-CN',
        interimResults: true,
        addsPunctuation: true,
        continuous: false,
        requiresOnDeviceRecognition: Platform.OS === 'ios' && supportsOnDevice,
        iosTaskHint: 'dictation',
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 180,
        },
      });
    } catch (e: any) {
      setIsRecording(false);
      setErrorText(e?.message || '启动语音识别失败');
    }
  };

  const stopRecordingAndRefine = () => {
    if (!isRecording) return;
    setIsRecording(false);

    try {
      speechModuleRef.current?.stop();
    } catch {
      // ignore
    }

    if (refiningTimerRef.current) clearTimeout(refiningTimerRef.current);
    refiningTimerRef.current = setTimeout(() => {
      void refineText(transcriptRef.current);
    }, 320);
  };

  const primaryRecordLabel = nativeMode
    ? isRecording
      ? '结束录音'
      : outputText
        ? '重新录音'
        : '开始录音'
    : isRefining
      ? 'AI 微调中...'
      : '微调文本';

  return (
    <Modal transparent visible={isOpen} animationType="fade" onRequestClose={onClose}>
      <View style={styles.mask}>
        <Pressable style={styles.close} onPress={onClose}><X size={20} color="white" /></Pressable>

        <View style={styles.center}>
          <View style={[styles.orbOuter, isRecording && { borderColor: '#60a5fa' }]}>
            <View style={[styles.orb, isRecording && styles.orbRecording]}>
              <Infinity size={46} color="white" />
            </View>
          </View>

          <Text style={styles.tip}>
            {nativeMode
              ? isRecording
                ? '正在录音，再点一次结束。'
                : '点一下开始录音，再点一下结束并整理文本。'
              : '当前为兼容模式：Expo Go 使用手动输入；Dev Client/正式包可用原生语音识别'}
          </Text>

          {nativeMode ? (
            <View style={styles.textPanel}>
              <Text style={styles.panelLabel}>{isRefining ? 'AI 正在微调...' : refinedText ? '微调后内容' : '实时识别'}</Text>
              <Text style={styles.textContent}>{(isRefining ? draftText : refinedText || draftText) || '按住说话，内容会实时显示在这里'}</Text>
            </View>
          ) : (
            <>
              <TextInput
                value={manualInput}
                onChangeText={setManualInput}
                multiline
                placeholder="把你刚说的话贴到这里，点击“微调文本”继续"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
              <Pressable onPress={() => refineText(manualInput)} disabled={isRefining || !manualInput.trim()} style={[styles.holdBtn, (isRefining || !manualInput.trim()) && styles.disabledBtn]}>
                <Mic size={18} color="white" />
                <Text style={styles.holdBtnText}>{primaryRecordLabel}</Text>
              </Pressable>
            </>
          )}

          {!!errorText && <Text style={styles.error}>{errorText}</Text>}

          {nativeMode && (
            <Pressable
              onPress={() => {
                if (isRecording) {
                  stopRecordingAndRefine();
                  return;
                }
                void startRecording();
              }}
              disabled={isRefining}
              style={[styles.holdBtn, isRecording && styles.holdBtnActive, isRefining && styles.disabledBtn]}
            >
              <Mic size={18} color="white" />
              <Text style={styles.holdBtnText}>{primaryRecordLabel}</Text>
              <View style={[styles.levelBar, { width: `${Math.max(10, volume * 100)}%` }]} />
            </Pressable>
          )}

          {!!outputText && (
            <View style={styles.textPanel}>
              <Text style={styles.panelLabel}>最终文本</Text>
              <Text style={styles.textContent}>{outputText}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.secondaryBtn, !canSubmit && styles.disabledBtn]}
              onPress={() => {
                if (!canSubmit) return;
                void onGenerateNote(outputText);
              }}
            >
              <Text style={[styles.secondaryText, !canSubmit && styles.disabledText]}>生成笔记</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.disabledBtn]}
              onPress={() => {
                if (!canSubmit) return;
                onAskAI(outputText);
              }}
            >
              <Sparkles size={15} color="white" />
              <Text style={styles.primaryText}>和 AI 助手沟通</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: 'rgba(2,6,23,0.72)', paddingTop: 56 },
  close: { marginLeft: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  orbOuter: { width: 206, height: 206, borderRadius: 103, borderWidth: 1, borderColor: 'rgba(125,211,252,0.35)', alignItems: 'center', justifyContent: 'center' },
  orb: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  orbRecording: { backgroundColor: '#2563eb' },
  tip: { color: 'rgba(255,255,255,0.88)', marginTop: 16, fontSize: 13, textAlign: 'center' },
  input: { width: '100%', marginTop: 12, minHeight: 110, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(241,245,249,0.96)', color: '#111827' },
  holdBtn: { marginTop: 12, width: '100%', borderRadius: 12, backgroundColor: '#2563eb', paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, overflow: 'hidden' },
  holdBtnActive: { backgroundColor: '#1d4ed8' },
  holdBtnText: { color: 'white', fontSize: 14, fontWeight: '700', zIndex: 2 },
  levelBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.18)' },
  textPanel: { width: '100%', minHeight: 96, marginTop: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 10 },
  panelLabel: { fontSize: 12, color: '#6b7280' },
  textContent: { marginTop: 8, color: '#111827', lineHeight: 22, fontSize: 15 },
  error: { marginTop: 8, color: '#fca5a5', fontSize: 12 },
  actionRow: { width: '100%', marginTop: 12, flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.93)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#111827', fontWeight: '700' },
  primaryBtn: { flex: 1.5, height: 44, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  primaryText: { color: 'white', fontWeight: '700' },
  disabledBtn: { opacity: 0.45 },
  disabledText: { color: '#9ca3af' },
});
