import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Loader, Send, Sparkles } from 'lucide-react-native';
import { chat } from '../services/bailian-chat';
import { useNoteStore } from '../store/noteStore';
import { AppView, ChatMessage } from '../types';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  initialInput?: string;
  initialInputVersion?: number;
}

const QUICK_ACTIONS = [
  { id: 'summarize', label: '总结最近笔记', prompt: '请总结我最近几条笔记的核心要点，并给出 3 条行动建议。' },
  { id: 'todo', label: '提取待办', prompt: '请从我最近笔记中提取待办事项，按高/中/低优先级分组。' },
  { id: 'outline', label: '生成大纲', prompt: '基于我最近笔记内容，生成一个可执行的项目大纲。' },
];

export default function AIChatView({ onNavigate, initialInput, initialInputVersion }: Props) {
  const { notes } = useNoteStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialInput?.trim()) setInput(initialInput.trim());
  }, [initialInput, initialInputVersion]);

  const context = useMemo(() => {
    const recent = notes.slice(0, 5);
    if (!recent.length) return '暂无笔记内容，请先创建笔记。';
    return recent
      .map((n, idx) => `${idx + 1}. ${n.title}\n${n.content.slice(0, 280)}`)
      .join('\n\n');
  }, [notes]);

  const send = async (preset?: string) => {
    const text = (preset || input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const resp = await chat(next, {
        temperature: 0.7,
        systemPrompt: `你是 EchoNote 移动端 AI 助手。基于用户最近笔记回答问题。\n\n最近笔记：\n${context}`,
      });
      setMessages([...next, { role: 'assistant', content: resp.content || '我整理好了，但当前没有可展示内容。' }]);
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `请求失败：${e?.message || 'unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('home')} style={styles.backBtn}><ChevronLeft size={24} color="#111827" /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>AI 对话</Text>
          <Text style={styles.sub}>基于最近笔记上下文</Text>
        </View>
      </View>

      {!messages.length ? (
        <View style={styles.welcome}>
          <View style={styles.logo}><Sparkles size={20} color="#7c3aed" /></View>
          <Text style={styles.welcomeTitle}>开始一段对话</Text>
          <Text style={styles.welcomeSub}>你可以直接提问，或使用快捷指令</Text>
          <View style={styles.quickWrap}>
            {QUICK_ACTIONS.map((item) => (
              <Pressable key={item.id} style={styles.quickBtn} onPress={() => send(item.prompt)}>
                <Text style={styles.quickText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20, gap: 8 }}>
          {messages.map((m, idx) => (
            <View key={`${m.role}-${idx}`} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, m.role === 'user' ? { color: 'white' } : { color: '#111827' }]}>{m.content}</Text>
            </View>
          ))}
          {loading ? (
            <View style={[styles.bubble, styles.assistantBubble, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <Loader size={14} color="#6b7280" />
              <Text style={{ color: '#6b7280' }}>思考中...</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="询问、搜索或创作任何内容..."
          style={styles.input}
          multiline
        />
        <Pressable onPress={() => send()} style={[styles.sendBtn, (!input.trim() || loading) && { backgroundColor: '#d1d5db' }]} disabled={!input.trim() || loading}>
          <Send size={16} color="white" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  title: { fontSize: 19, fontWeight: '700', color: '#111827' },
  sub: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  logo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { marginTop: 12, fontSize: 18, fontWeight: '700', color: '#111827' },
  welcomeSub: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  quickWrap: { marginTop: 14, width: '100%', gap: 8 },
  quickBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  quickText: { color: '#374151', fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
  bubble: { maxWidth: '86%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#3b82f6' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: 'white' },
  input: { flex: 1, maxHeight: 110, backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
});
