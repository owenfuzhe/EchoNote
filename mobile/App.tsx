import React, { useEffect, useState } from 'react';
import { Alert, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
import BottomNav from './src/components/BottomNav';
import VoiceCapture from './src/components/VoiceCapture';
import CaptureMenu from './src/components/CaptureMenu';
import { fetchContent, isWechatUrl, isXiaohongshuUrl } from './src/services/contentFetcher';
import { useNoteStore } from './src/store/noteStore';
import { AppView } from './src/types';

const BACKEND_KEY = 'echonote_mobile_backend';
const DEFAULT_BACKEND = 'http://192.168.50.197:8000';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isVoiceCaptureOpen, setIsVoiceCaptureOpen] = useState(false);
  const [isCaptureMenuOpen, setIsCaptureMenuOpen] = useState(false);
  const [isCaptureLoading, setIsCaptureLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [aiDraftInput, setAiDraftInput] = useState('');
  const [aiDraftVersion, setAiDraftVersion] = useState(0);

  const { fetchNotes, createNote } = useNoteStore();

  useEffect(() => {
    fetchNotes();
    (async () => {
      const saved = await AsyncStorage.getItem(BACKEND_KEY);
      if (saved) setBackendUrl(saved);
    })();
  }, [fetchNotes]);

  const handleNavigate = (view: AppView, noteId?: string) => {
    if (noteId) setSelectedNoteId(noteId);
    setCurrentView(view);
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

  const handleVoiceAskAI = (text: string) => {
    const finalText = text.trim();
    if (!finalText) return;
    setAiDraftInput(finalText);
    setAiDraftVersion((v) => v + 1);
    setIsVoiceCaptureOpen(false);
    setCurrentView('aiChat');
  };

  const handleFileCapture = async (type?: 'pdf' | 'audio') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type === 'audio' ? ['audio/*'] : ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const title = file.name?.replace(/\.[^/.]+$/, '') || '文件笔记';
      const content = `【文件信息】\n\n文件名：${file.name}\n类型：${file.mimeType || '未知'}\n大小：${((file.size || 0) / 1024).toFixed(2)} KB\n\n> 移动端首版暂未内置文件正文解析`; 
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
    setIsCaptureLoading(true);
    setIsCaptureMenuOpen(false);
    try {
      const result = await fetchContent(url, backendUrl);
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

      const id = await createNote({
        title,
        content,
        type: 'link',
        sourceUrl: result.sourceWebpage || url,
        snapshotHtml: result.snapshotHtml,
        tags,
      });
      handleNavigate('document', id);
    } catch (e: any) {
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

  const handleSelectSkill = async (skillId: string) => {
    if (skillId === 'search') setCurrentView('search');
    else if (skillId === 'chat' || skillId === 'brainstorm' || skillId === 'draft') setCurrentView('aiChat');
    else if (skillId === 'explore') setCurrentView('explore');
    else if (skillId === 'tasks') setCurrentView('tasks');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.app} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />

        {currentView === 'home' && <HomeView onNavigate={handleNavigate} />}
        {currentView === 'library' && <LibraryView onNavigate={handleNavigate} />}
        {currentView === 'document' && <DocumentView onNavigate={handleNavigate} noteId={selectedNoteId} />}
        {currentView === 'search' && <SearchView onNavigate={handleNavigate} onClose={() => setCurrentView('home')} />}
        {currentView === 'tasks' && <TasksView onNavigate={handleNavigate} />}
        {currentView === 'explore' && <ExploreView onNavigate={handleNavigate} />}
        {currentView === 'aiChat' && <AIChatView onNavigate={handleNavigate} initialInput={aiDraftInput} initialInputVersion={aiDraftVersion} />}

        <BottomNav
          currentView={currentView}
          onNavigate={setCurrentView}
          onCaptureMenu={() => setIsCaptureMenuOpen(true)}
          onSearch={() => setCurrentView('search')}
          onSelectSkill={handleSelectSkill}
          onAIVoiceCapture={() => setIsVoiceCaptureOpen(true)}
        />

        <VoiceCapture
          isOpen={isVoiceCaptureOpen}
          onClose={() => setIsVoiceCaptureOpen(false)}
          onGenerateNote={handleVoiceGenerateNote}
          onAskAI={handleVoiceAskAI}
        />

        <CaptureMenu
          isOpen={isCaptureMenuOpen}
          onClose={() => setIsCaptureMenuOpen(false)}
          onFileCapture={handleFileCapture}
          onImageCapture={handleImageCapture}
          onLinkCapture={handleLinkSubmit}
          onYoutubeCapture={handleYoutubeCapture}
          onTextCapture={handleTextCapture}
          isLoading={isCaptureLoading}
        />
      </SafeAreaView>
    </SafeAreaProvider>
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
});
