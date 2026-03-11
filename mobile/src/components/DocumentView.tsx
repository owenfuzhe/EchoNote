import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CheckSquare, ChevronLeft, History, Share, Sparkles } from 'lucide-react-native';
import { chat } from '../services/bailian-chat';
import { saveContextTrace } from '../services/context-graph';
import { createTodoItem, extractTodos } from '../services/todo-extractor';
import { useNoteStore } from '../store/noteStore';
import { AppView, ChatMessage, DocumentTab } from '../types';
import ContextPanel from './ContextPanel';
import ExportContext from './ExportContext';

interface Props { onNavigate: (view: AppView, noteId?: string) => void; noteId: string | null }

export default function DocumentView({ onNavigate, noteId }: Props) {
  const { updateNote, getNoteById, notes } = useNoteStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isExtractingTodos, setIsExtractingTodos] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showExportContext, setShowExportContext] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentTab>('article');

  const note = noteId ? getNoteById(noteId) : undefined;
  const hasSource = note?.type === 'link' && !!note.sourceUrl;
  const hasSnapshot = note?.type === 'link' && !!note.snapshotHtml?.trim();

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
    setActiveTab('article');
  }, [note?.id]);

  useEffect(() => {
    if (!noteId || !note) return;
    const t = setTimeout(async () => {
      if (title !== note.title || content !== note.content) {
        setIsSaving(true);
        await updateNote(noteId, { title, content });
        setTimeout(() => setIsSaving(false), 450);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [title, content, noteId, note?.title, note?.content]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !note) return;
    const user: ChatMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, user];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const systemPrompt = `你是 EchoNote 助手。基于这篇笔记回答：\n标题：${note.title}\n内容：${note.content}`;
      const resp = await chat(newMessages, { systemPrompt, temperature: 0.7 });
      setChatMessages([...newMessages, { role: 'assistant', content: resp.content }]);
      await saveContextTrace({ noteId: note.id, trigger: 'manual', inputs: [chatInput], generatedAt: new Date().toISOString(), model: resp.model, type: 'ai_chat' });
    } catch (e: any) {
      setChatMessages([...newMessages, { role: 'assistant', content: `抱歉，发生错误：${e?.message || 'unknown'}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const extract = async () => {
    if (!noteId || !content.trim()) return;
    setIsExtractingTodos(true);
    try {
      const todos = await extractTodos(content);
      if (!todos.length) {
        Alert.alert('提示', '未检测到待办事项');
        return;
      }
      const items = todos.map((t) => createTodoItem(t.text, t.priority));
      await updateNote(noteId, { todos: [...(note?.todos || []), ...items] });
      await saveContextTrace({ noteId, trigger: 'manual', inputs: [content.slice(0, 500)], generatedAt: new Date().toISOString(), model: 'qwen-max', type: 'todo_extract' });
      Alert.alert('成功', `已提取 ${items.length} 个待办事项`);
    } catch (e: any) {
      Alert.alert('失败', e?.message || '提取失败');
    } finally {
      setIsExtractingTodos(false);
    }
  };

  if (!note) {
    return <View style={styles.emptyWrap}><Text style={styles.emptyText}>笔记不存在</Text><Pressable onPress={() => onNavigate('home')}><Text style={styles.backText}>返回首页</Text></Pressable></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('home')} style={styles.iconBtn}><ChevronLeft size={26} color="#111827" /></Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}><Text numberOfLines={1} style={styles.headTitle}>{title || 'Untitled'}</Text><Text style={styles.headSub}>📁 私人{isSaving ? ' · 保存中...' : ''}</Text></View>
        <View style={styles.headerActions}>
          <Pressable onPress={extract} style={styles.iconBtn} disabled={isExtractingTodos}><CheckSquare size={22} color="#111827" /></Pressable>
          <Pressable onPress={() => setShowAIChat((s) => !s)} style={styles.iconBtn}><Sparkles size={22} color={showAIChat ? '#2563eb' : '#111827'} /></Pressable>
          <Pressable onPress={() => setShowExportContext(true)} style={styles.iconBtn}><Share size={22} color="#111827" /></Pressable>
          <Pressable onPress={() => setShowContextPanel(true)} style={styles.iconBtn}><History size={22} color="#111827" /></Pressable>
        </View>
      </View>

      <View style={styles.sheet}>
        <TextInput value={title} onChangeText={setTitle} style={styles.titleInput} placeholder="Document Title" />

        {(hasSource || hasSnapshot) && (
          <View style={styles.tabs}>
            <Tab active={activeTab === 'article'} label="文章" onPress={() => setActiveTab('article')} />
            {hasSource && <Tab active={activeTab === 'source'} label="源网页" onPress={() => setActiveTab('source')} />}
            {hasSnapshot && <Tab active={activeTab === 'snapshot'} label="快照" onPress={() => setActiveTab('snapshot')} />}
          </View>
        )}

        {activeTab === 'article' && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 180 }}>
            <TextInput value={content} onChangeText={setContent} multiline style={styles.contentInput} textAlignVertical="top" placeholder="开始输入内容..." />
          </ScrollView>
        )}
        {activeTab === 'source' && note.sourceUrl && <View style={{ flex: 1 }}><Text style={styles.urlText}>{note.sourceUrl}</Text><WebView source={{ uri: note.sourceUrl }} style={styles.webview} /></View>}
        {activeTab === 'snapshot' && note.snapshotHtml && <WebView source={{ html: note.snapshotHtml }} style={styles.webview} />}
      </View>

      {showAIChat && (
        <View style={styles.chatPanel}>
          <View style={styles.chatHead}><Text style={styles.chatTitle}>AI 助手</Text><Pressable onPress={() => setShowAIChat(false)}><Text style={{ color: '#9ca3af' }}>✕</Text></Pressable></View>
          <ScrollView style={{ maxHeight: 220, padding: 12 }} contentContainerStyle={{ gap: 8 }}>
            {chatMessages.length === 0 ? <Text style={{ color: '#9ca3af', textAlign: 'center' }}>问我关于这篇笔记的任何问题...</Text> : null}
            {chatMessages.map((m, i) => <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}><Text style={{ color: m.role === 'user' ? 'white' : '#1f2937' }}>{m.content}</Text></View>)}
            {isChatLoading && <View style={[styles.bubble, styles.assistantBubble]}><Text>思考中...</Text></View>}
          </ScrollView>
          <View style={styles.chatInputRow}><TextInput value={chatInput} onChangeText={setChatInput} placeholder="输入消息..." style={styles.chatInput} onSubmitEditing={sendMessage} /><Pressable onPress={sendMessage} style={styles.sendBtn}><Text style={{ color: 'white', fontWeight: '600' }}>发送</Text></Pressable></View>
        </View>
      )}

      <ContextPanel noteId={noteId || ''} isOpen={showContextPanel} onClose={() => setShowContextPanel(false)} />
      <ExportContext notes={notes} isOpen={showExportContext} onClose={() => setShowExportContext(false)} />
    </KeyboardAvoidingView>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#d6e7ef' },
  header: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headTitle: { fontSize: 17, fontWeight: '700', color: '#111827', maxWidth: 170 },
  headSub: { color: '#4b5563', marginTop: 2, fontSize: 12 },
  sheet: { flex: 1, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 18 },
  titleInput: { fontSize: 30, fontWeight: '700', color: '#111827', marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, alignSelf: 'flex-start', padding: 4, marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tabActive: { backgroundColor: 'white' },
  tabText: { color: '#6b7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  contentInput: { minHeight: 380, fontSize: 17, color: '#1f2937', lineHeight: 28 },
  urlText: { color: '#6b7280', fontSize: 12, marginBottom: 6 },
  webview: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  chatPanel: { position: 'absolute', left: 14, right: 14, bottom: 96, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  chatHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  chatTitle: { fontWeight: '700', color: '#111827' },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  userBubble: { backgroundColor: '#3b82f6', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#f3f4f6', alignSelf: 'flex-start' },
  chatInputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  chatInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { backgroundColor: '#3b82f6', borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af' },
  backText: { color: '#2563eb', marginTop: 10 },
});
