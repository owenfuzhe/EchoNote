import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Loader, Mic, Search, Send, Sparkles, SquarePen } from 'lucide-react-native';
import { chat } from '../services/bailian-chat';
import { useNoteStore } from '../store/noteStore';
import { AppView, ChatMessage } from '../types';
import { richTextToPreview } from '../utils/richText';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  onOpenVoiceCapture?: () => void;
  initialInput?: string;
  initialInputVersion?: number;
  contextTitle?: string;
  contextBody?: string;
  contextVersion?: number;
}

const GENERAL_ACTIONS = [
  { id: 'search', label: '搜索任何内容', prompt: '请基于我最近笔记，帮我找出当前最值得继续看的线索。' },
  { id: 'brainstorm', label: '头脑风暴写作创意', prompt: '请基于我最近笔记，给我 5 个值得展开的写作方向。' },
  { id: 'draft', label: '起草项目方案', prompt: '请把我最近笔记整理成一个可执行的项目方案初稿。' },
];

const FOCUSED_ACTIONS = [
  { id: 'focus-summary', label: '总结这篇内容', prompt: '请总结这篇内容的核心判断，并提炼 3 条关键信号。' },
  { id: 'focus-question', label: '继续追问', prompt: '请基于这篇内容，给我 3 个最值得继续追问的问题。' },
  { id: 'focus-next', label: '整理下一步', prompt: '请基于这篇内容，给我 3 条最值得执行的下一步动作。' },
];

export default function AIChatView({
  onNavigate,
  onOpenVoiceCapture,
  initialInput,
  initialInputVersion,
  contextTitle,
  contextBody,
  contextVersion,
}: Props) {
  const { notes } = useNoteStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialInput?.trim()) setInput(initialInput.trim());
  }, [initialInput, initialInputVersion]);

  useEffect(() => {
    if (contextVersion) {
      setMessages([]);
    }
  }, [contextVersion]);

  const focusedContext = useMemo(() => {
    const title = contextTitle?.trim() || '';
    const body = contextBody?.trim() || '';
    return body ? { title: title || '当前内容', body } : null;
  }, [contextBody, contextTitle]);

  const context = useMemo(() => {
    if (focusedContext) {
      return `当前聚焦内容：\n标题：${focusedContext.title}\n内容：${focusedContext.body}`;
    }
    const recent = notes.slice(0, 5);
    if (!recent.length) return '暂无笔记内容，请先创建笔记。';
    return recent
      .map((note, index) => `${index + 1}. ${note.title}\n${richTextToPreview(note.content, 240)}`)
      .join('\n\n');
  }, [focusedContext, notes]);

  const quickActions = focusedContext ? FOCUSED_ACTIONS : GENERAL_ACTIONS;
  const headerLabel = focusedContext ? '当前内容助手' : 'EchoNote AI';
  const welcomeTitle = focusedContext ? '这篇内容，我们继续。' : '今日事，我来帮。';
  const welcomeSub = focusedContext ? '围绕当前内容，先收束判断，再推进下一步。' : '你可以直接提问，也可以从下面这些动作开始。';

  const resetConversation = () => {
    setMessages([]);
    setLoading(false);
    setInput(initialInput?.trim() || '');
  };

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
        systemPrompt: focusedContext
          ? `你是 EchoNote 移动端 AI 助手。请严格围绕当前这篇内容回答、总结或追问。\n\n当前内容：\n${context}`
          : `你是 EchoNote 移动端 AI 助手。请基于用户最近笔记帮助用户总结、拆解、追问和推进下一步。\n\n最近笔记：\n${context}`,
      });
      setMessages([...next, { role: 'assistant', content: resp.content || '我整理好了，但当前没有可展示内容。' }]);
    } catch (error: any) {
      setMessages([...next, { role: 'assistant', content: `请求失败：${error?.message || 'unknown error'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const sourceLabel = focusedContext ? '当前内容' : '最近笔记';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('home')} style={styles.iconBtn}>
          <ChevronLeft size={22} color="#111827" />
        </Pressable>

        <View style={styles.headerPill}>
          <Sparkles size={14} color="#c2410c" />
          <Text style={styles.headerPillText}>{headerLabel}</Text>
        </View>

        <Pressable onPress={resetConversation} style={styles.iconBtn}>
          <SquarePen size={20} color="#6b7280" />
        </Pressable>
      </View>

      {!messages.length ? (
        <View style={styles.welcomeWrap}>
          <View style={styles.heroBadge}>
            <Sparkles size={22} color="#111827" />
          </View>

          <Text style={styles.welcomeTitle}>{welcomeTitle}</Text>
          <Text style={styles.welcomeSub}>{welcomeSub}</Text>

          {focusedContext ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextEyebrow}>当前上下文</Text>
              <Text style={styles.contextTitle}>{focusedContext.title}</Text>
              <Text numberOfLines={4} style={styles.contextBody}>
                {focusedContext.body}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionsList}>
            {quickActions.map((item, index) => (
              <Pressable key={item.id} style={[styles.actionRow, index > 0 && styles.actionDivider]} onPress={() => send(item.prompt)}>
                {index === 0 ? <Search size={18} color="#111827" /> : <Sparkles size={18} color="#111827" />}
                <Text style={styles.actionText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {focusedContext ? (
            <View style={styles.contextInlineCard}>
              <Text style={styles.contextInlineLabel}>围绕当前内容</Text>
              <Text numberOfLines={2} style={styles.contextInlineTitle}>{focusedContext.title}</Text>
            </View>
          ) : null}

          {messages.map((message, index) => (
            <View key={`${message.role}-${index}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, message.role === 'user' ? styles.userBubbleText : styles.assistantBubbleText]}>
                {message.content}
              </Text>
            </View>
          ))}

          {loading ? (
            <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
              <Loader size={14} color="#6b7280" />
              <Text style={styles.loadingText}>正在整理回答…</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View style={styles.composerDock}>
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="询问、搜索或创作任何内容..."
            placeholderTextColor="#a8a29e"
            style={styles.input}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.composerFooter}>
            <View style={styles.sourceChip}>
              <Sparkles size={14} color="#6b7280" />
              <Text style={styles.sourceChipText}>{sourceLabel}</Text>
            </View>

            <View style={styles.composerActions}>
              <Pressable onPress={onOpenVoiceCapture} style={styles.micBtn}>
                <Mic size={16} color="#44403c" />
              </Pressable>

              <Pressable
                onPress={() => send()}
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                disabled={!input.trim() || loading}
              >
                <Send size={16} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fcfaf5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPill: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f7efe7',
    borderWidth: 1,
    borderColor: '#f0e2d3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerPillText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#7c2d12',
    fontWeight: '700',
  },
  welcomeWrap: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 44,
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ece7dd',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
  welcomeTitle: {
    marginTop: 22,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: '#111827',
    fontWeight: '700',
  },
  welcomeSub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: '#6b7280',
  },
  contextCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ede7da',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contextEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8b7d6b',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contextTitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#111827',
    fontWeight: '700',
  },
  contextBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#6b7280',
  },
  actionsList: {
    marginTop: 28,
  },
  actionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#ece7dd',
  },
  actionText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    color: '#1f2937',
    fontWeight: '500',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 18,
  },
  messageContent: {
    paddingTop: 8,
    paddingBottom: 18,
    gap: 10,
  },
  contextInlineCard: {
    marginBottom: 4,
    borderRadius: 18,
    backgroundColor: '#f7f4ee',
    borderWidth: 1,
    borderColor: '#ece7dd',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contextInlineLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#8b7d6b',
    fontWeight: '700',
  },
  contextInlineTitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#111827',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ece7dd',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 24,
  },
  userBubbleText: {
    color: '#ffffff',
  },
  assistantBubbleText: {
    color: '#111827',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
  },
  composerDock: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 14,
    backgroundColor: '#fcfaf5',
  },
  composer: {
    borderRadius: 26,
    backgroundColor: '#f6f3ee',
    borderWidth: 1,
    borderColor: '#ebe5db',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  input: {
    minHeight: 58,
    maxHeight: 140,
    fontSize: 17,
    lineHeight: 24,
    color: '#111827',
    padding: 0,
  },
  composerFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sourceChip: {
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e1d6',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceChipText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e1d6',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#d6d3d1',
  },
});
