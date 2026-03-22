import React, { useEffect, useRef, useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeView from './src/components/HomeView';
import LibraryView from './src/components/LibraryView';
import DocumentView from './src/components/DocumentView';
import SearchView from './src/components/SearchView';
import TasksView from './src/components/TasksView';
import ExploreView from './src/components/ExploreView';
import AIChatView from './src/components/AIChatView';
import BriefingView from './src/components/BriefingView';
import BottomNav from './src/components/BottomNav';
import VoiceCapture from './src/components/VoiceCapture';
import CaptureMenu from './src/components/CaptureMenu';
import { fetchContent, isWechatUrl, isXiaohongshuUrl } from './src/services/contentFetcher';
import { BACKEND_KEY, DEFAULT_BACKEND } from './src/services/backend-config';
import { getDefaultBriefingNoteIds } from './src/services/briefing';
import { getDefaultExploreTopic, getExploreTopicOptions } from './src/services/topic-workspace';
import { bindSupabaseAuthLifecycle, ensureSupabaseUser, isSupabaseConfigured, supabase } from './src/services/supabase';
import { useNoteStore } from './src/store/noteStore';
import { AppView, Note } from './src/types';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<Partial<Note> | null>(null);
  const [isVoiceCaptureOpen, setIsVoiceCaptureOpen] = useState(false);
  const [isCaptureMenuOpen, setIsCaptureMenuOpen] = useState(false);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureProgressLabel, setCaptureProgressLabel] = useState('');
  const [showCaptureProgress, setShowCaptureProgress] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [aiDraftInput, setAiDraftInput] = useState('');
  const [aiDraftVersion, setAiDraftVersion] = useState(0);
  const [aiContextTitle, setAiContextTitle] = useState('');
  const [aiContextBody, setAiContextBody] = useState('');
  const [aiContextVersion, setAiContextVersion] = useState(0);
  const [briefingNoteIds, setBriefingNoteIds] = useState<string[]>([]);
  const [exploreTopic, setExploreTopic] = useState('');
  const [customExploreTopics, setCustomExploreTopics] = useState<string[]>([]);
  const captureProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureProgressHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { notes, fetchNotes, createNote } = useNoteStore();

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(BACKEND_KEY);
      if (saved) setBackendUrl(saved);

      try {
        if (isSupabaseConfigured) {
          await ensureSupabaseUser();
        }
      } catch (e: any) {
        console.warn('Supabase bootstrap failed:', e?.message || e);
      }

      await fetchNotes();
    })();
  }, [fetchNotes]);

  useEffect(() => {
    const unbindLifecycle = bindSupabaseAuthLifecycle();
    if (!supabase) return unbindLifecycle;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void fetchNotes();
    });

    return () => {
      unbindLifecycle();
      subscription.unsubscribe();
    };
  }, [fetchNotes]);

  useEffect(() => {
    if (!notes.length) return;

    setBriefingNoteIds((current) => {
      const valid = current.filter((id) => notes.some((note) => note.id === id));
      return valid.length ? valid : getDefaultBriefingNoteIds(notes);
    });
  }, [notes]);

  useEffect(() => {
    if (!notes.length && !customExploreTopics.length) return;

    const options = getExploreTopicOptions(notes, customExploreTopics);
    const valid = new Set(options.map((option) => option.label));
    const nextDefault = getDefaultExploreTopic(notes, customExploreTopics);
    setExploreTopic((current) => (current && valid.has(current) ? current : nextDefault));
  }, [notes, customExploreTopics]);

  useEffect(() => {
    return () => {
      if (captureProgressIntervalRef.current) clearInterval(captureProgressIntervalRef.current);
      if (captureProgressHideRef.current) clearTimeout(captureProgressHideRef.current);
    };
  }, []);

  const clearCaptureProgressTimers = () => {
    if (captureProgressIntervalRef.current) {
      clearInterval(captureProgressIntervalRef.current);
      captureProgressIntervalRef.current = null;
    }
    if (captureProgressHideRef.current) {
      clearTimeout(captureProgressHideRef.current);
      captureProgressHideRef.current = null;
    }
  };

  const beginCaptureProgress = (label: string) => {
    clearCaptureProgressTimers();
    setCaptureProgressLabel(label);
    setCaptureProgress(0.14);
    setShowCaptureProgress(true);
    captureProgressIntervalRef.current = setInterval(() => {
      setCaptureProgress((current) => {
        if (current >= 0.74) return current;
        const delta = current < 0.38 ? 0.08 : 0.04;
        return Math.min(current + delta, 0.74);
      });
    }, 280);
  };

  const updateCaptureProgress = (label: string, target: number) => {
    setCaptureProgressLabel(label);
    setCaptureProgress((current) => Math.max(current, target));
  };

  const finishCaptureProgress = (label: string) => {
    clearCaptureProgressTimers();
    setCaptureProgressLabel(label);
    setCaptureProgress(1);
    captureProgressHideRef.current = setTimeout(() => {
      setShowCaptureProgress(false);
      setCaptureProgress(0);
      setCaptureProgressLabel('');
    }, 700);
  };

  const handleNavigate = (view: AppView, noteId?: string) => {
    if (noteId) {
      setSelectedNoteId(noteId);
      setDraftNote(null);
    } else if (view !== 'document') {
      setSelectedNoteId(null);
      setDraftNote(null);
    }
    setCurrentView(view);
  };

  const handleCreateBlankNote = () => {
    setIsCaptureMenuOpen(false);
    setSelectedNoteId(null);
    setDraftNote({ title: '', content: '', type: 'text', tags: [] });
    setCurrentView('document');
  };

  const handlePersistDraft = (noteId: string) => {
    setSelectedNoteId(noteId);
    setDraftNote(null);
  };

  const handleVoiceGenerateNote = async (text: string) => {
    const finalText = text.trim();
    if (!finalText) return;
    const id = await createNote({
      title: finalText.slice(0, 20) + (finalText.length > 20 ? '...' : ''),
      content: finalText,
      type: 'voice',
      tags: ['语音输入', 'AI润色'],
    });
    setIsVoiceCaptureOpen(false);
    handleNavigate('document', id);
  };

  const openAIAssistant = (
    input = '',
    context?: {
      title?: string;
      content?: string;
    }
  ) => {
    setAiDraftInput(input.trim());
    setAiDraftVersion((v) => v + 1);
    setAiContextTitle(context?.title?.trim() || '');
    setAiContextBody(context?.content?.trim() || '');
    setAiContextVersion((v) => v + 1);
    setCurrentView('aiChat');
  };

  const handleVoiceAskAI = (text: string) => {
    const finalText = text.trim();
    if (!finalText) return;
    setIsVoiceCaptureOpen(false);
    openAIAssistant(finalText);
  };

  const handleFileCapture = async (type?: 'pdf' | 'audio') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          type === 'audio'
            ? ['audio/*']
            : ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const title = file.name?.replace(/\.[^/.]+$/, '') || '文件笔记';
      const content = `【文件信息】\n\n文件名：${file.name}\n类型：${file.mimeType || '未知'}\n大小：${((file.size || 0) / 1024).toFixed(
        2
      )} KB\n\n> 移动端首版暂未内置文件正文解析`;
      const id = await createNote({ title, content, type: 'text', tags: [type === 'audio' ? '音频' : '文件'] });
      handleNavigate('document', id);
      setIsCaptureMenuOpen(false);
    } catch (e: any) {
      Alert.alert('失败', e?.message || '文件读取失败');
    }
  };

  const handleImageCapture = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('权限不足', '请允许访问相册');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: false, base64: false });
      if (result.canceled || !result.assets?.[0]) return;
      const image = result.assets[0];
      const id = await createNote({
        title: `图片笔记 - ${new Date().toLocaleDateString()}`,
        content: `## 图片内容\n\n图片 URI: ${image.uri}\n\n> OCR 能力将在后续版本接入`,
        type: 'image',
        tags: ['图片'],
      });
      handleNavigate('document', id);
      setIsCaptureMenuOpen(false);
    } catch (e: any) {
      Alert.alert('失败', e?.message || '图片处理失败');
    }
  };

  const handleLinkSubmit = async (url?: string) => {
    if (!url?.trim()) return;
    beginCaptureProgress('正在连接来源');
    setIsCaptureLoading(true);
    setIsCaptureMenuOpen(false);
    try {
      const result = await fetchContent(url, backendUrl);
      updateCaptureProgress('正在整理正文', 0.76);
      let title = result.title || extractTitleFromUrl(url);
      let content = result.content || '';
      let tags: string[] = ['链接收藏'];

      if (isWechatUrl(url)) {
        tags = ['微信公众号'];
        if (result.author && result.author !== 'Unknown') title = `${result.title} - ${result.author}`;
      } else if (isXiaohongshuUrl(url)) {
        tags = ['小红书'];
        if (result.restricted) content = `${content}\n\n> ⚠️ 该笔记内容受保护，无法自动抓取完整内容。`;
      } else if (result.bvid) {
        tags = ['B站视频'];
        if (result.uploader) title = `${result.title} - ${result.uploader}`;
      }

      updateCaptureProgress('正在保存到 EchoNote', 0.9);
      const id = await createNote({
        title,
        content,
        type: 'link',
        sourceUrl: result.sourceWebpage || url,
        snapshotHtml: result.snapshotHtml,
        tags,
      });
      finishCaptureProgress('导入完成');
      handleNavigate('document', id);
    } catch (e: any) {
      finishCaptureProgress('导入失败');
      Alert.alert('抓取失败', e?.message || '请检查后端地址与链接是否可访问');
    } finally {
      setIsCaptureLoading(false);
    }
  };

  const handleYoutubeCapture = async (url: string) => handleLinkSubmit(url);

  const handleTextCapture = async (text: string) => {
    let finalText = text;
    if (text === '请手动粘贴文字内容') {
      const clip = await Clipboard.getStringAsync();
      finalText = clip?.trim() ? clip : text;
    }
    const id = await createNote({
      title: finalText.slice(0, 30) + (finalText.length > 30 ? '...' : ''),
      content: finalText,
      type: 'text',
      tags: ['剪贴内容'],
    });
    setIsCaptureMenuOpen(false);
    handleNavigate('document', id);
  };

  const handleSelectExploreTopic = (topic: string) => {
    const next = topic.trim();
    if (!next) return;
    setExploreTopic(next);
  };

  const handleCreateExploreTopic = (topic: string) => {
    const next = topic.trim();
    if (!next) return;
    setCustomExploreTopics((current) => (current.includes(next) ? current : [...current, next]));
    setExploreTopic(next);
  };

  const handleOpenAIChallenge = (prompt: string) => {
    const next = prompt.trim();
    if (!next) return;
    openAIAssistant(next);
  };

  return (
    <GestureHandlerRootView style={styles.app}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.app} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" />

          {currentView === 'home' && (
            <HomeView
              onNavigate={handleNavigate}
              briefingNoteIds={briefingNoteIds}
              onUpdateBriefingNoteIds={setBriefingNoteIds}
              exploreTopic={exploreTopic}
              customExploreTopics={customExploreTopics}
              onSelectExploreTopic={handleSelectExploreTopic}
              onCreateExploreTopic={handleCreateExploreTopic}
              onOpenAIAssistant={openAIAssistant}
            />
          )}
          {currentView === 'library' && <LibraryView onNavigate={handleNavigate} />}
          {currentView === 'document' && (
            <DocumentView
              onNavigate={handleNavigate}
              noteId={selectedNoteId}
              draftNote={draftNote}
              onPersistDraft={handlePersistDraft}
              onOpenAIAssistant={openAIAssistant}
            />
          )}
          {currentView === 'search' && <SearchView onNavigate={handleNavigate} onClose={() => setCurrentView('home')} />}
          {currentView === 'tasks' && <TasksView onNavigate={handleNavigate} />}
          {currentView === 'explore' && (
            <ExploreView
              onNavigate={handleNavigate}
              currentTopic={exploreTopic}
              customTopics={customExploreTopics}
              onSelectTopic={handleSelectExploreTopic}
              onCreateTopic={handleCreateExploreTopic}
              onOpenAIChallenge={handleOpenAIChallenge}
            />
          )}
          {currentView === 'aiChat' && (
            <AIChatView
              onNavigate={handleNavigate}
              initialInput={aiDraftInput}
              initialInputVersion={aiDraftVersion}
              contextTitle={aiContextTitle}
              contextBody={aiContextBody}
              contextVersion={aiContextVersion}
            />
          )}
          {currentView === 'briefing' && <BriefingView onNavigate={handleNavigate} selectedNoteIds={briefingNoteIds} />}

          {currentView !== 'document' && currentView !== 'aiChat' && (
            <BottomNav
              currentView={currentView}
              onNavigate={setCurrentView}
              onCaptureMenu={() => setIsCaptureMenuOpen(true)}
              onSearch={() => setCurrentView('search')}
              onOpenAIAssistant={() => openAIAssistant()}
              onAIVoiceCapture={() => setIsVoiceCaptureOpen(true)}
            />
          )}

          {showCaptureProgress && (
            <View pointerEvents="none" style={styles.captureProgressDock}>
              <View style={styles.captureProgressCard}>
                <View style={styles.captureProgressHead}>
                  <Text style={styles.captureProgressTitle}>{captureProgressLabel || '正在导入'}</Text>
                  <Text style={styles.captureProgressPercent}>{`${Math.round(captureProgress * 100)}%`}</Text>
                </View>
                <View style={styles.captureProgressTrack}>
                  <View style={[styles.captureProgressFill, { width: `${Math.max(10, Math.round(captureProgress * 100))}%` }]} />
                </View>
              </View>
            </View>
          )}

          <VoiceCapture
            isOpen={isVoiceCaptureOpen}
            onClose={() => setIsVoiceCaptureOpen(false)}
            onGenerateNote={handleVoiceGenerateNote}
            onAskAI={handleVoiceAskAI}
          />

          <CaptureMenu
            isOpen={isCaptureMenuOpen}
            onClose={() => setIsCaptureMenuOpen(false)}
            onCreateBlankNote={handleCreateBlankNote}
            onFileCapture={handleFileCapture}
            onImageCapture={handleImageCapture}
            onLinkCapture={handleLinkSubmit}
            onYoutubeCapture={handleYoutubeCapture}
            onTextCapture={handleTextCapture}
            isLoading={isCaptureLoading}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function extractTitleFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return `来自 ${host} 的收藏`;
  } catch {
    return '链接收藏';
  }
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#f8fafc' },
  captureProgressDock: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 92,
  },
  captureProgressCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 12,
  },
  captureProgressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  captureProgressTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  captureProgressPercent: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  captureProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
    overflow: 'hidden',
  },
  captureProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#38bdf8',
  },
});
