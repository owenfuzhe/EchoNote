import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { RichText, useBridgeState, useEditorBridge, useEditorContent } from '@10play/tentap-editor';
import {
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Ellipsis,
  Heading1,
  History,
  List,
  ListOrdered,
  Plus,
  Quote,
  Redo2,
  Share,
  Sparkles,
  SquarePen,
  Type,
  Undo2,
} from 'lucide-react-native';
import { chat } from '../services/bailian-chat';
import { saveContextTrace } from '../services/context-graph';
import { createTodoItem, extractTodos } from '../services/todo-extractor';
import { useNoteStore } from '../store/noteStore';
import { AppView, ChatMessage, DocumentTab } from '../types';
import { normalizeContentForEditor, richTextToPlainText } from '../utils/richText';
import ContextPanel from './ContextPanel';
import ExportContext from './ExportContext';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  noteId: string | null;
  draftNote?: { title?: string; content?: string; type?: string; tags?: string[] } | null;
  onPersistDraft?: (noteId: string) => void;
}

type DocumentKind = 'article' | 'note';
type ToolbarPanel = 'insert' | 'ai' | null;

const EDITOR_THEME = {
  webview: {
    backgroundColor: 'transparent',
  },
  webviewContainer: {
    backgroundColor: 'transparent',
    flex: 1,
    minHeight: 320,
  },
};

const EDITOR_CSS = `
  body {
    background: transparent;
    margin: 0;
    padding: 0;
  }

  .ProseMirror {
    min-height: 360px;
    color: #0f172a;
    font-size: 18px;
    line-height: 1.8;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', sans-serif;
    letter-spacing: -0.01em;
    padding: 0 0 24px 0;
    outline: none;
  }

  .ProseMirror p {
    margin: 0 0 0.9em;
  }

  .ProseMirror h1,
  .ProseMirror h2,
  .ProseMirror h3 {
    color: #0f172a;
    margin: 0 0 0.55em;
    letter-spacing: -0.03em;
  }

  .ProseMirror h1 {
    font-size: 32px;
    line-height: 1.12;
    font-weight: 700;
  }

  .ProseMirror h2 {
    font-size: 24px;
    line-height: 1.24;
    font-weight: 700;
  }

  .ProseMirror h3 {
    font-size: 20px;
    line-height: 1.3;
    font-weight: 600;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    margin: 0.2em 0 0.95em;
    padding-left: 1.2em;
  }

  .ProseMirror li p {
    margin: 0;
  }

  .ProseMirror blockquote {
    margin: 0.2em 0 1em;
    padding-left: 1em;
    border-left: 3px solid #dbe3f0;
    color: #475569;
  }

  .ProseMirror pre {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    color: #0f172a;
    font-size: 14px;
    line-height: 1.6;
    margin: 0.3em 0 1em;
    padding: 14px 16px;
    white-space: pre-wrap;
  }

  .ProseMirror code {
    font-family: 'SFMono-Regular', 'Menlo', 'Monaco', monospace;
  }

  .ProseMirror a {
    color: #2563eb;
    text-decoration: none;
  }

  .ProseMirror img {
    border-radius: 16px;
  }
`;

export default function DocumentView({ onNavigate, noteId, draftNote, onPersistDraft }: Props) {
  const { updateNote, getNoteById, notes, createNote, error } = useNoteStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('<p></p>');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isExtractingTodos, setIsExtractingTodos] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showExportContext, setShowExportContext] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentTab>('article');
  const [showArticleTabPicker, setShowArticleTabPicker] = useState(false);

  const note = noteId ? getNoteById(noteId) : undefined;
  const isDraft = !note && !!draftNote;
  const documentKind: DocumentKind =
    note?.type === 'link' || note?.type === 'file' || note?.type === 'image' ? 'article' : 'note';
  const isArticle = !isDraft && documentKind === 'article';
  const hasSource = note?.type === 'link' && !!note.sourceUrl;
  const hasSnapshot = note?.type === 'link' && !!note.snapshotHtml?.trim();
  const normalizedPersistedContent = useMemo(
    () => normalizeContentForEditor(note?.content ?? draftNote?.content ?? ''),
    [draftNote?.content, note?.content]
  );
  const plainContent = useMemo(() => richTextToPlainText(content), [content]);
  const articleBodyText = useMemo(() => {
    return richTextToPlainText(content || note?.content || '').trim() || '暂无正文内容';
  }, [content, note?.content]);
  const syncState = useMemo(() => {
    if (isSaving || isCreatingDraft) {
      return { label: '保存中', tone: 'saving' as const };
    }
    if (error?.includes('本地')) {
      return { label: '本地缓存', tone: 'local' as const };
    }
    return { label: '已同步', tone: 'synced' as const };
  }, [error, isCreatingDraft, isSaving]);
  const headerPillLabel = isArticle ? '来源文章' : `私人笔记 · ${syncState.label}`;
  const contextTitle = title.trim() || note?.title || '未命名笔记';
  const contextBody = plainContent.trim() || richTextToPlainText(note?.content || '');
  const articleTabOptions = useMemo(() => {
    const options: Array<{ key: DocumentTab; label: string }> = hasSnapshot
      ? [
          { key: 'snapshot', label: '正文' },
          { key: 'article', label: '纯文本' },
        ]
      : [{ key: 'article', label: '正文' }];
    if (hasSource) options.push({ key: 'source', label: '原网页' });
    return options;
  }, [hasSnapshot, hasSource]);
  const activeArticleTabLabel = useMemo(() => {
    return articleTabOptions.find((option) => option.key === activeTab)?.label || articleTabOptions[0]?.label || '正文';
  }, [activeTab, articleTabOptions]);
  const noteUpdatedLabel = useMemo(() => {
    if (!note?.updatedAt) return '刚刚';
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(
      new Date(note.updatedAt)
    );
  }, [note?.updatedAt]);

  useEffect(() => {
    const nextTitle = note?.title ?? draftNote?.title ?? '';
    const nextEditorContent = normalizeContentForEditor(note?.content ?? draftNote?.content ?? '');

    setTitle(nextTitle);
    setContent(nextEditorContent);

    setIsCreatingDraft(false);
    setActiveTab(note?.type === 'link' && note?.snapshotHtml?.trim() ? 'snapshot' : 'article');
    setShowMoreMenu(false);
    setShowArticleTabPicker(false);
  }, [draftNote?.content, draftNote?.title, note?.content, note?.id, note?.snapshotHtml, note?.title, note?.type]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isArticle || !noteId || !note) return;

    const timer = setTimeout(async () => {
      if (title !== note.title || content !== normalizedPersistedContent) {
        setIsSaving(true);
        await updateNote(noteId, { title, content });
        setTimeout(() => setIsSaving(false), 450);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, isArticle, normalizedPersistedContent, note, noteId, title, updateNote]);

  useEffect(() => {
    if (!isDraft || !onPersistDraft) return;
    if (isCreatingDraft) return;
    if (!title.trim() && !plainContent.trim()) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      setIsCreatingDraft(true);
      try {
        const generatedTitle = title.trim() || plainContent.trim().slice(0, 26) || '未命名笔记';
        const id = await createNote({
          title: generatedTitle,
          content,
          type: 'text',
          tags: draftNote?.tags || [],
        });
        onPersistDraft(id);
      } catch {
        setIsCreatingDraft(false);
      } finally {
        setTimeout(() => setIsSaving(false), 280);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [content, createNote, draftNote?.tags, isCreatingDraft, isDraft, onPersistDraft, plainContent, title]);

  const runAIConversation = async (prompt: string) => {
    if (!contextBody) {
      Alert.alert('内容太少', '先写一点内容，再让 AI 帮你整理。');
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: prompt };
    const nextMessages = [...chatMessages, userMessage];
    setShowAIChat(true);
    setChatMessages(nextMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const systemPrompt = `你是 EchoNote 助手。请基于当前笔记帮助用户整理内容。\n标题：${contextTitle}\n内容：${contextBody}`;
      const resp = await chat(nextMessages, { systemPrompt, temperature: 0.7 });
      setChatMessages([...nextMessages, { role: 'assistant', content: resp.content }]);
      if (note?.id) {
        await saveContextTrace({
          noteId: note.id,
          trigger: 'manual',
          inputs: [prompt],
          generatedAt: new Date().toISOString(),
          model: resp.model,
          type: 'ai_chat',
        });
      }
    } catch (e: any) {
      setChatMessages([...nextMessages, { role: 'assistant', content: `抱歉，发生错误：${e?.message || 'unknown'}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    await runAIConversation(chatInput.trim());
  };

  const extract = async () => {
    if (!noteId || !contextBody.trim()) {
      Alert.alert('暂不可用', '先让笔记保存成正式内容，再提炼待办。');
      return;
    }

    setIsExtractingTodos(true);
    try {
      const todos = await extractTodos(contextBody);
      if (!todos.length) {
        Alert.alert('提示', '未检测到待办事项');
        return;
      }

      const items = todos.map((todo) => createTodoItem(todo.text, todo.priority));
      await updateNote(noteId, { todos: [...(note?.todos || []), ...items] });
      await saveContextTrace({
        noteId,
        trigger: 'manual',
        inputs: [contextBody.slice(0, 500)],
        generatedAt: new Date().toISOString(),
        model: 'qwen-max',
        type: 'todo_extract',
      });
      Alert.alert('成功', `已提取 ${items.length} 个待办事项`);
    } catch (e: any) {
      Alert.alert('失败', e?.message || '提取失败');
    } finally {
      setIsExtractingTodos(false);
    }
  };

  const createEditableNoteFromArticle = async () => {
    if (!note) return;
    try {
      const articlePrefix = note.sourceUrl ? `来源：${note.sourceUrl}\n\n` : '';
      const id = await createNote({
        title: note.title || '新笔记',
        content: normalizeContentForEditor(`${articlePrefix}${note.content || ''}`.trim()),
        type: 'text',
        tags: Array.from(new Set([...(note.tags || []), '摘录'])) as string[],
      });
      onNavigate('document', id);
    } catch (e: any) {
      Alert.alert('失败', e?.message || '创建笔记失败');
    }
  };

  const openAIChat = () => {
    setShowMoreMenu(false);
    setShowArticleTabPicker(false);
    setShowAIChat(true);
  };

  const openContextPanel = () => {
    setShowMoreMenu(false);
    setShowArticleTabPicker(false);
    setShowContextPanel(true);
  };

  const openExportContext = () => {
    setShowMoreMenu(false);
    setShowArticleTabPicker(false);
    setShowExportContext(true);
  };

  const selectArticleTab = (tab: DocumentTab) => {
    setActiveTab(tab);
    setShowArticleTabPicker(false);
    setShowMoreMenu(false);
  };

  const dismissEditorKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleBack = async () => {
    if (isDraft && !isCreatingDraft && (title.trim() || plainContent.trim()) && onPersistDraft) {
      setIsSaving(true);
      setIsCreatingDraft(true);
      try {
        const id = await createNote({
          title: title.trim() || plainContent.trim().slice(0, 26) || '未命名笔记',
          content,
          type: 'text',
          tags: draftNote?.tags || [],
        });
        onPersistDraft(id);
      } catch (e: any) {
        Alert.alert('保存失败', e?.message || '请稍后重试');
        setIsSaving(false);
        setIsCreatingDraft(false);
        return;
      }
    }

    onNavigate('home');
  };

  if (!note && !isDraft) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>笔记不存在</Text>
        <Pressable onPress={() => onNavigate('home')}>
          <Text style={styles.backText}>返回首页</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, isArticle && styles.articleRoot]}>
      <KeyboardAvoidingView
        style={[styles.root, isArticle && styles.articleRoot]}
        behavior={Platform.OS === 'ios' && (isArticle || showAIChat) ? 'padding' : undefined}
      >
        <View style={[styles.header, isArticle && styles.articleHeader]}>
          <View style={styles.headerSide}>
            <Pressable onPress={handleBack} style={styles.iconBtn}>
              <ChevronLeft size={24} color="#111827" />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            {isArticle ? (
              <Pressable
                onPress={() => {
                  setShowMoreMenu(false);
                  setShowArticleTabPicker((current) => !current);
                }}
                style={[styles.articleTabTrigger, showArticleTabPicker && styles.articleTabTriggerActive]}
              >
                <Text style={styles.articleTabTriggerText}>{activeArticleTabLabel}</Text>
                <ChevronDown size={14} color="#94a3b8" />
              </Pressable>
            ) : (
              <View
                style={[
                  styles.headerPill,
                  syncState.tone === 'local' && styles.headerPillLocal,
                  syncState.tone === 'saving' && styles.headerPillSaving,
                ]}
              >
                <Text style={styles.headerPillText}>{headerPillLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            {!isArticle && Platform.OS !== 'ios' && isKeyboardVisible && (
              <Pressable onPress={dismissEditorKeyboard} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>完成</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                setShowArticleTabPicker(false);
                setShowMoreMenu((current) => !current);
              }}
              style={styles.iconBtn}
            >
              <Ellipsis size={20} color="#111827" />
            </Pressable>
          </View>
        </View>

        {isArticle && showArticleTabPicker && (
          <View style={styles.articleTabOverlay} pointerEvents="box-none">
            <Pressable style={styles.articleTabOverlayMask} onPress={() => setShowArticleTabPicker(false)} />
            <View style={styles.articleTabPicker}>
              {articleTabOptions.map((option, index) => {
                const isActive = option.key === activeTab;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => selectArticleTab(option.key)}
                    style={[styles.articleTabOption, index > 0 && styles.articleTabOptionBorder]}
                  >
                    <View style={styles.articleTabOptionRow}>
                      <View style={styles.articleTabOptionIconWrap}>
                        {isActive ? <Check size={18} color="#111827" /> : null}
                      </View>
                      <Text style={[styles.articleTabOptionText, isActive && styles.articleTabOptionTextActive]}>
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={[styles.sheet, isArticle ? styles.articleSheet : styles.noteSheet]}>
          {isArticle ? (
            <View style={styles.articleHero}>
              <Text style={styles.articleTitle}>{note?.title || '未命名文章'}</Text>
            </View>
          ) : (
            <View style={styles.noteHero}>
              <Text style={styles.noteMetaLine}>{isDraft ? '空白笔记' : `私人笔记 · 上次更新 ${noteUpdatedLabel}`}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={styles.titleInput}
                placeholder="无标题"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={dismissEditorKeyboard}
                onFocus={() => {
                  setShowMoreMenu(false);
                }}
              />
            </View>
          )}

          {!isArticle && (hasSource || hasSnapshot) && (
            <View style={styles.tabs}>
              <Tab active={activeTab === 'article'} label="正文" onPress={() => setActiveTab('article')} />
              {hasSource && <Tab active={activeTab === 'source'} label="源网页" onPress={() => setActiveTab('source')} />}
              {hasSnapshot && <Tab active={activeTab === 'snapshot'} label="快照" onPress={() => setActiveTab('snapshot')} />}
            </View>
          )}

          {activeTab === 'article' && (
            isArticle ? (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.articleScrollContent}
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => Keyboard.dismiss()}
              >
                <Text style={styles.articleBody}>{articleBodyText}</Text>
              </ScrollView>
            ) : (
              <NoteBodyEditor
                key={note?.id ?? 'draft-note-editor'}
                initialContent={normalizedPersistedContent}
                onChange={setContent}
                isKeyboardVisible={isKeyboardVisible}
                keyboardHeight={keyboardHeight}
                showAIChat={showAIChat}
                onRunAIConversation={runAIConversation}
                onOpenAIChat={openAIChat}
                onExtractTodos={extract}
                isExtractingTodos={isExtractingTodos}
              />
            )
          )}

          {activeTab === 'source' && note?.sourceUrl && (
            <View style={{ flex: 1 }}>
              <Text style={styles.urlText}>{note.sourceUrl}</Text>
              <WebView source={{ uri: note.sourceUrl }} style={styles.webview} />
            </View>
          )}

          {activeTab === 'snapshot' && note?.snapshotHtml && (
            <WebView source={{ html: note.snapshotHtml }} style={styles.webview} />
          )}
        </View>

        {showAIChat && (
          <View style={styles.chatPanel}>
            <View style={styles.chatHead}>
              <Text style={styles.chatTitle}>AI 助手</Text>
              <Pressable onPress={() => setShowAIChat(false)}>
                <Text style={{ color: '#9ca3af' }}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 220, padding: 12 }} contentContainerStyle={{ gap: 8 }}>
              {chatMessages.length === 0 ? (
                <Text style={{ color: '#9ca3af', textAlign: 'center' }}>问我关于这篇笔记的任何问题...</Text>
              ) : null}
              {chatMessages.map((message, index) => (
                <View
                  key={index}
                  style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}
                >
                  <Text style={{ color: message.role === 'user' ? 'white' : '#1f2937' }}>{message.content}</Text>
                </View>
              ))}
              {isChatLoading && (
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <Text>思考中...</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="输入消息..."
                style={styles.chatInput}
                onSubmitEditing={sendMessage}
              />
              <Pressable onPress={sendMessage} style={styles.sendBtn}>
                <Text style={{ color: 'white', fontWeight: '600' }}>发送</Text>
              </Pressable>
            </View>
          </View>
        )}

        {showMoreMenu && (
          <Pressable style={styles.menuMask} onPress={() => setShowMoreMenu(false)}>
            <View style={styles.menuCard}>
              {isArticle && (
                <MenuAction
                  label="摘录为笔记"
                  icon={<SquarePen size={16} color="#111827" />}
                  onPress={createEditableNoteFromArticle}
                />
              )}
              {!isArticle && (
                <MenuAction
                  label={isExtractingTodos ? '提取待办中...' : '提取待办'}
                  icon={<CheckSquare size={16} color="#111827" />}
                  onPress={extract}
                  disabled={isExtractingTodos}
                />
              )}
              <MenuAction label="分享" icon={<Share size={16} color="#111827" />} onPress={openExportContext} />
              <MenuAction label="AI 助手" icon={<Sparkles size={16} color="#111827" />} onPress={openAIChat} />
              <MenuAction label="上下文溯源" icon={<History size={16} color="#111827" />} onPress={openContextPanel} />
            </View>
          </Pressable>
        )}

        <ContextPanel noteId={noteId || ''} isOpen={showContextPanel} onClose={() => setShowContextPanel(false)} />
        <ExportContext notes={notes} isOpen={showExportContext} onClose={() => setShowExportContext(false)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const NoteBodyEditor = memo(function NoteBodyEditor({
  initialContent,
  onChange,
  isKeyboardVisible,
  keyboardHeight,
  showAIChat,
  onRunAIConversation,
  onOpenAIChat,
  onExtractTodos,
  isExtractingTodos,
}: {
  initialContent: string;
  onChange: (content: string) => void;
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  showAIChat: boolean;
  onRunAIConversation: (prompt: string) => Promise<void>;
  onOpenAIChat: () => void;
  onExtractTodos: () => Promise<void>;
  isExtractingTodos: boolean;
}) {
  const [toolbarPanel, setToolbarPanel] = useState<ToolbarPanel>(null);
  const initialContentRef = useRef(initialContent);
  const lastObservedContentRef = useRef(initialContent);
  const selectionRef = useRef({ from: 1, to: 1 });
  const toolbarBarHeight = 58;
  const replacementPanelHeight = Math.max(keyboardHeight || 0, 292);
  const editorBridge = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialContentRef.current || '<p></p>',
    editable: true,
    theme: EDITOR_THEME,
  });
  const editorRef = useRef(editorBridge);
  const editor = editorRef.current;
  const onRunAIConversationRef = useRef(onRunAIConversation);
  const onOpenAIChatRef = useRef(onOpenAIChat);
  const onExtractTodosRef = useRef(onExtractTodos);
  const editorState = useBridgeState(editor);
  const observedEditorHtml = useEditorContent(editor, { type: 'html', debounceInterval: 160 });
  const shouldShowKeyboardToolbar = Platform.OS === 'ios' && !showAIChat && (isKeyboardVisible || toolbarPanel !== null);
  const toolbarBottomOffset = toolbarPanel ? replacementPanelHeight : keyboardHeight;

  useEffect(() => {
    onRunAIConversationRef.current = onRunAIConversation;
  }, [onRunAIConversation]);

  useEffect(() => {
    onOpenAIChatRef.current = onOpenAIChat;
  }, [onOpenAIChat]);

  useEffect(() => {
    onExtractTodosRef.current = onExtractTodos;
  }, [onExtractTodos]);

  useEffect(() => {
    editor.setContent(initialContentRef.current || '<p></p>');
    editor.setPlaceholder('开始输入正文...');

    const timer = setTimeout(() => {
      editor.injectCSS(EDITOR_CSS, 'echonote-rich-editor');
    }, 120);

    return () => clearTimeout(timer);
  }, [editor]);

  useEffect(() => {
    if (initialContent === lastObservedContentRef.current) return;
    initialContentRef.current = initialContent;
    editor.setContent(initialContent || '<p></p>');
  }, [editor, initialContent]);

  useEffect(() => {
    if (observedEditorHtml === undefined) return;
    lastObservedContentRef.current = observedEditorHtml;
    onChange(observedEditorHtml);
  }, [observedEditorHtml, onChange]);

  useEffect(() => {
    if (editorState.selection?.from && editorState.selection?.to) {
      selectionRef.current = {
        from: editorState.selection.from,
        to: editorState.selection.to,
      };
    }
  }, [editorState.selection?.from, editorState.selection?.to]);

  useEffect(() => {
    if (!shouldShowKeyboardToolbar) {
      setToolbarPanel(null);
    }
  }, [shouldShowKeyboardToolbar]);

  useEffect(() => {
    if (showAIChat) {
      setToolbarPanel(null);
    }
  }, [showAIChat]);

  useEffect(() => {
    if (!shouldShowKeyboardToolbar) {
      editor.updateScrollThresholdAndMargin(0);
      return;
    }
    editor.updateScrollThresholdAndMargin(toolbarPanel ? replacementPanelHeight + toolbarBarHeight : toolbarBarHeight + 12);
  }, [editor, replacementPanelHeight, shouldShowKeyboardToolbar, toolbarBarHeight, toolbarPanel]);

  const restoreEditorKeyboard = () => {
    setTimeout(() => {
      editor.setSelection(selectionRef.current.from, selectionRef.current.to);
      editor.focus();
    }, 70);
  };

  const restoreEditorSelection = () => {
    editor.setSelection(selectionRef.current.from, selectionRef.current.to);
  };

  const closeToolbarPanel = (restoreKeyboard = true) => {
    setToolbarPanel(null);
    if (restoreKeyboard) {
      restoreEditorKeyboard();
    }
  };

  const completeEditorCommand = () => {
    if (toolbarPanel) {
      closeToolbarPanel(true);
    }
  };

  const insertHeading = (level: 1 | 2 = 1) => {
    if (toolbarPanel) {
      restoreEditorSelection();
    }
    editor.toggleHeading(level);
    completeEditorCommand();
  };

  const insertTodo = () => {
    if (toolbarPanel) {
      restoreEditorSelection();
    }
    editor.toggleTaskList();
    completeEditorCommand();
  };

  const insertQuote = () => {
    if (toolbarPanel) {
      restoreEditorSelection();
    }
    editor.toggleBlockquote();
    completeEditorCommand();
  };

  const insertBulletList = () => {
    if (toolbarPanel) {
      restoreEditorSelection();
    }
    editor.toggleBulletList();
    completeEditorCommand();
  };

  const insertNumberedList = () => {
    if (toolbarPanel) {
      restoreEditorSelection();
    }
    editor.toggleOrderedList();
    completeEditorCommand();
  };

  const toggleToolbarPanel = (panel: Exclude<ToolbarPanel, null>) => {
    if (toolbarPanel === panel) {
      closeToolbarPanel(true);
      return;
    }

    if (editorState.selection?.from && editorState.selection?.to) {
      selectionRef.current = {
        from: editorState.selection.from,
        to: editorState.selection.to,
      };
    }
    setToolbarPanel(panel);
    editor.blur();
    Keyboard.dismiss();
  };

  const dismissEditorKeyboard = () => {
    setToolbarPanel(null);
    editor.blur();
    Keyboard.dismiss();
  };

  return (
    <View style={styles.noteEditorArea}>
      {Platform.OS !== 'ios' && (
        <View style={styles.noteToolbar}>
          <ToolbarChip label="插入" onPress={() => toggleToolbarPanel('insert')} />
          <ToolbarChip label="H1" onPress={() => insertHeading(1)} active={editorState.headingLevel === 1} />
          <ToolbarChip label="待办" onPress={insertTodo} active={!!editorState.isTaskListActive} />
          <ToolbarChip label="引用" onPress={insertQuote} active={!!editorState.isBlockquoteActive} />
          <ToolbarChip label="AI" onPress={() => toggleToolbarPanel('ai')} />
        </View>
      )}

      <View style={styles.editorCard}>
        <RichText
          editor={editor}
          style={styles.editorWebview}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
        />
      </View>

      {Platform.OS !== 'ios' && toolbarPanel === 'insert' && (
        <View style={styles.inlinePanel}>
          <View style={styles.toolbarGrid}>
            <SecondaryAction icon={<Heading1 size={18} color="#111827" />} label="标题一" onPress={() => insertHeading(1)} />
            <SecondaryAction icon={<Heading1 size={18} color="#111827" />} label="标题二" onPress={() => insertHeading(2)} />
            <SecondaryAction icon={<CheckSquare size={18} color="#111827" />} label="待办清单" onPress={insertTodo} />
            <SecondaryAction icon={<Quote size={18} color="#111827" />} label="引用" onPress={insertQuote} />
            <SecondaryAction icon={<List size={18} color="#111827" />} label="无序列表" onPress={insertBulletList} />
            <SecondaryAction icon={<ListOrdered size={18} color="#111827" />} label="编号列表" onPress={insertNumberedList} />
          </View>
        </View>
      )}

      {Platform.OS !== 'ios' && toolbarPanel === 'ai' && (
        <View style={styles.inlinePanel}>
          <View style={styles.toolbarGrid}>
              <SecondaryAction
                icon={<Sparkles size={18} color="#7c3aed" />}
                label="总结全文"
                onPress={() => {
                  setToolbarPanel(null);
                  void onRunAIConversationRef.current('请帮我总结这篇笔记，输出 3 条关键要点。');
                }}
              />
              <SecondaryAction
                icon={<SquarePen size={18} color="#7c3aed" />}
                label="继续写作"
                onPress={() => {
                  setToolbarPanel(null);
                  void onRunAIConversationRef.current('请基于当前内容继续往下写，保持原有语气，并补足下一段。');
                }}
              />
              <SecondaryAction
                icon={<Type size={18} color="#7c3aed" />}
                label="改写更清晰"
                onPress={() => {
                  setToolbarPanel(null);
                  void onRunAIConversationRef.current('请把这篇笔记改写得更清晰，适合以后快速回看。');
                }}
              />
              <SecondaryAction
                icon={<CheckSquare size={18} color="#7c3aed" />}
                label="提炼待办"
                onPress={() => {
                  setToolbarPanel(null);
                  void onExtractTodosRef.current();
                }}
                disabled={isExtractingTodos}
              />
          </View>
          <Pressable
            onPress={() => {
              setToolbarPanel(null);
              onOpenAIChatRef.current();
            }}
            style={styles.toolbarPanelFooter}
          >
            <Text style={styles.toolbarPanelFooterText}>进入 AI 对话</Text>
          </Pressable>
        </View>
      )}

      {shouldShowKeyboardToolbar && (
        <>
          {toolbarPanel && (
            <View style={[styles.toolbarReplacementPanel, { height: replacementPanelHeight }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.toolbarReplacementPanelContent}
                keyboardShouldPersistTaps="handled"
              >
                {toolbarPanel === 'insert' ? (
                  <>
                    <View style={styles.toolbarPanelHandle} />
                    <Text style={styles.toolbarPanelTitle}>插入结构</Text>
                    <Text style={styles.toolbarPanelHint}>像 Notion 一样，先选结构，再继续写。</Text>
                    <View style={styles.toolbarGrid}>
                      <SecondaryAction icon={<Heading1 size={18} color="#111827" />} label="标题一" onPress={() => insertHeading(1)} />
                      <SecondaryAction icon={<Heading1 size={18} color="#111827" />} label="标题二" onPress={() => insertHeading(2)} />
                      <SecondaryAction icon={<CheckSquare size={18} color="#111827" />} label="待办清单" onPress={insertTodo} />
                      <SecondaryAction icon={<Quote size={18} color="#111827" />} label="引用" onPress={insertQuote} />
                      <SecondaryAction icon={<List size={18} color="#111827" />} label="无序列表" onPress={insertBulletList} />
                      <SecondaryAction icon={<ListOrdered size={18} color="#111827" />} label="编号列表" onPress={insertNumberedList} />
                      <SecondaryAction icon={<Undo2 size={18} color="#111827" />} label="撤销" onPress={() => editor.undo()} disabled={!editorState.canUndo} />
                      <SecondaryAction icon={<Redo2 size={18} color="#111827" />} label="重做" onPress={() => editor.redo()} disabled={!editorState.canRedo} />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.toolbarPanelHandle} />
                    <Text style={styles.toolbarPanelTitle}>AI 辅助整理</Text>
                    <Text style={styles.toolbarPanelHint}>保持当前笔记语境，只做整理和补全。</Text>
                    <View style={styles.toolbarGrid}>
                      <SecondaryAction
                        icon={<Sparkles size={18} color="#7c3aed" />}
                        label="总结全文"
                        onPress={() => {
                          closeToolbarPanel(false);
                          void onRunAIConversationRef.current('请帮我总结这篇笔记，输出 3 条关键要点。');
                        }}
                      />
                      <SecondaryAction
                        icon={<SquarePen size={18} color="#7c3aed" />}
                        label="继续写作"
                        onPress={() => {
                          closeToolbarPanel(false);
                          void onRunAIConversationRef.current('请基于当前内容继续往下写，保持原有语气，并补足下一段。');
                        }}
                      />
                      <SecondaryAction
                        icon={<Type size={18} color="#7c3aed" />}
                        label="改写更清晰"
                        onPress={() => {
                          closeToolbarPanel(false);
                          void onRunAIConversationRef.current('请把这篇笔记改写得更清晰，适合以后快速回看。');
                        }}
                      />
                      <SecondaryAction
                        icon={<CheckSquare size={18} color="#7c3aed" />}
                        label="提炼待办"
                        onPress={() => {
                          closeToolbarPanel(false);
                          void onExtractTodosRef.current();
                        }}
                        disabled={isExtractingTodos}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        closeToolbarPanel(false);
                        onOpenAIChatRef.current();
                      }}
                      style={styles.toolbarPanelFooter}
                    >
                      <Text style={styles.toolbarPanelFooterText}>进入 AI 对话</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          )}

          <View style={[styles.keyboardBarDock, { bottom: toolbarBottomOffset }]}>
            <View style={styles.keyboardBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.keyboardBarScroll}
              contentContainerStyle={styles.keyboardBarScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <AccessoryButton icon={<Plus size={16} color="#334155" />} label="插入" onPress={() => toggleToolbarPanel('insert')} active={toolbarPanel === 'insert'} />
              <AccessoryButton label="标题" onPress={() => insertHeading(1)} active={editorState.headingLevel === 1} />
              <AccessoryButton icon={<CheckSquare size={16} color="#334155" />} label="待办" onPress={insertTodo} active={!!editorState.isTaskListActive} />
              <AccessoryButton icon={<Quote size={16} color="#334155" />} label="引用" onPress={insertQuote} active={!!editorState.isBlockquoteActive} />
              <AccessoryButton icon={<Sparkles size={16} color="#7c3aed" />} label="AI" onPress={() => toggleToolbarPanel('ai')} active={toolbarPanel === 'ai'} />
            </ScrollView>
              <AccessoryButton
                icon={toolbarPanel ? <ClosePanelIcon /> : <KeyboardDismissIcon />}
                onPress={toolbarPanel ? () => closeToolbarPanel(true) : dismissEditorKeyboard}
                align="right"
                compact
                iconOnly
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}, (prev, next) => {
  return (
    prev.initialContent === next.initialContent &&
    prev.isKeyboardVisible === next.isKeyboardVisible &&
    prev.keyboardHeight === next.keyboardHeight &&
    prev.showAIChat === next.showAIChat &&
    prev.isExtractingTodos === next.isExtractingTodos
  );
});

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ToolbarChip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.toolbarChip, active && styles.toolbarChipActive]}>
      <Text style={[styles.toolbarChipText, active && styles.toolbarChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AccessoryButton({
  label,
  icon,
  onPress,
  align,
  active,
  compact,
  iconOnly,
}: {
  label?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  align?: 'left' | 'right';
  active?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.accessoryButton,
        compact && styles.accessoryButtonCompact,
        iconOnly && styles.accessoryButtonIconOnly,
        active && styles.accessoryButtonActive,
        align === 'right' && styles.accessoryButtonRight,
      ]}
    >
      {icon ? icon : null}
      {label ? <Text style={[styles.accessoryButtonText, active && styles.accessoryButtonTextActive]}>{label}</Text> : null}
    </Pressable>
  );
}

function KeyboardDismissIcon() {
  return (
    <View style={styles.keyboardDismissIcon}>
      <View style={styles.keyboardDismissIconBody}>
        <View style={styles.keyboardDismissIconRow}>
          <View style={styles.keyboardDismissIconKey} />
          <View style={styles.keyboardDismissIconKey} />
          <View style={styles.keyboardDismissIconKey} />
        </View>
        <View style={styles.keyboardDismissIconRow}>
          <View style={styles.keyboardDismissIconKey} />
          <View style={styles.keyboardDismissIconWideKey} />
          <View style={styles.keyboardDismissIconKey} />
        </View>
      </View>
      <ChevronLeft size={10} color="#64748b" style={{ transform: [{ rotate: '-90deg' }] }} />
    </View>
  );
}

function ClosePanelIcon() {
  return (
    <View style={styles.closePanelIcon}>
      <View style={styles.closePanelIconLine} />
      <View style={[styles.closePanelIconLine, styles.closePanelIconLineReverse]} />
    </View>
  );
}

function MenuAction({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.menuAction, disabled && styles.menuActionDisabled]} disabled={disabled}>
      {icon}
      <Text style={styles.menuActionText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryAction({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.secondaryAction, disabled && styles.secondaryActionDisabled]} disabled={disabled}>
      <View style={styles.secondaryActionIcon}>{icon}</View>
      <Text style={styles.secondaryActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  articleRoot: { backgroundColor: '#ffffff' },
  header: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  articleHeader: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#f1f3f5',
  },
  headerSide: { width: 44, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerActions: { minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  doneBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#eef2ff', marginRight: 2 },
  doneBtnText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  headerPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7ecf3' },
  headerPillLocal: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  headerPillSaving: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  headerPillText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  articleTabTrigger: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#edf0f4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  articleTabTriggerActive: {
    backgroundColor: '#ffffff',
    borderColor: '#e6eaef',
  },
  articleTabTriggerText: { fontSize: 14, lineHeight: 19, color: '#475569', fontWeight: '500' },
  articleTabOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  articleTabOverlayMask: {
    ...StyleSheet.absoluteFillObject,
  },
  articleTabPicker: {
    position: 'absolute',
    top: 66,
    alignSelf: 'center',
    width: 196,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#edf0f3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  articleTabOption: {
    minHeight: 58,
    paddingHorizontal: 18,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  articleTabOptionBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f2f4f7',
  },
  articleTabOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  articleTabOptionIconWrap: {
    width: 16,
    alignItems: 'center',
  },
  articleTabOptionText: { fontSize: 14, lineHeight: 20, color: '#111827', fontWeight: '500' },
  articleTabOptionTextActive: { fontWeight: '600' },
  sheet: { flex: 1, paddingHorizontal: 22, paddingTop: 20 },
  articleSheet: { backgroundColor: '#ffffff' },
  noteSheet: { backgroundColor: '#ffffff' },
  noteHero: { marginBottom: 12 },
  noteMetaLine: { fontSize: 13, lineHeight: 18, color: '#94a3b8', marginBottom: 10 },
  titleInput: { fontSize: 36, lineHeight: 42, fontWeight: '700', color: '#111827', marginBottom: 10, letterSpacing: -1 },
  articleHero: { marginBottom: 22 },
  articleTitle: { fontSize: 33, lineHeight: 39, fontWeight: '700', color: '#111827', letterSpacing: -0.9 },
  noteToolbar: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  toolbarChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  toolbarChipActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  toolbarChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  toolbarChipTextActive: { color: '#4f46e5' },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, alignSelf: 'flex-start', padding: 4, marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tabActive: { backgroundColor: 'white' },
  tabText: { color: '#6b7280' },
  tabTextActive: { color: '#111827', fontWeight: '600' },
  noteEditorArea: { flex: 1, minHeight: 0, paddingBottom: 16 },
  editorCard: {
    flex: 1,
    minHeight: 320,
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingTop: 4,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  editorWebview: { flex: 1, backgroundColor: 'transparent' },
  inlinePanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e7ecf3',
    backgroundColor: '#f8fafc',
  },
  articleScrollContent: { paddingBottom: 148 },
  articleBody: { fontSize: 18, lineHeight: 32, color: '#1f2937', paddingBottom: 4, letterSpacing: -0.12 },
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
  menuMask: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menuCard: {
    position: 'absolute',
    top: 72,
    right: 18,
    width: 172,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 8,
  },
  menuAction: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12 },
  menuActionDisabled: { opacity: 0.55 },
  menuActionText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  keyboardBarDock: {
    position: 'absolute',
    left: -22,
    right: -22,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 18,
    elevation: 10,
  },
  toolbarReplacementPanel: {
    position: 'absolute',
    left: -22,
    right: -22,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 24,
    elevation: 14,
  },
  toolbarReplacementPanelContent: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 18 },
  toolbarPanelHandle: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d7dde8',
    marginBottom: 12,
  },
  toolbarPanelTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  toolbarPanelHint: { fontSize: 12, lineHeight: 18, color: '#64748b', marginBottom: 12 },
  toolbarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolbarPanelFooter: { marginTop: 12, paddingVertical: 12, borderRadius: 16, alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#edf2f7' },
  toolbarPanelFooterText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  keyboardBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#ffffff', minHeight: 58 },
  keyboardBarScroll: { flex: 1 },
  keyboardBarScrollContent: { alignItems: 'center', gap: 8, paddingRight: 8 },
  accessoryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e7ecf3' },
  accessoryButtonCompact: { paddingHorizontal: 10 },
  accessoryButtonIconOnly: { width: 40, paddingHorizontal: 0, justifyContent: 'center' },
  accessoryButtonActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  accessoryButtonRight: { marginLeft: 'auto' },
  accessoryButtonText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  accessoryButtonTextActive: { color: '#4f46e5' },
  secondaryAction: {
    width: '48.4%',
    minHeight: 82,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8edf5',
    justifyContent: 'space-between',
  },
  secondaryActionDisabled: { opacity: 0.45 },
  secondaryActionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eef2f7' },
  secondaryActionText: { marginTop: 10, fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 20 },
  keyboardDismissIcon: { alignItems: 'center', gap: 2 },
  keyboardDismissIconBody: {
    width: 18,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94a3b8',
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 1,
    gap: 1,
  },
  keyboardDismissIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keyboardDismissIconKey: { width: 3, height: 2, borderRadius: 1, backgroundColor: '#94a3b8' },
  keyboardDismissIconWideKey: { width: 6, height: 2, borderRadius: 1, backgroundColor: '#94a3b8' },
  closePanelIcon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  closePanelIconLine: { position: 'absolute', width: 13, height: 1.5, borderRadius: 999, backgroundColor: '#64748b', transform: [{ rotate: '45deg' }] },
  closePanelIconLineReverse: { transform: [{ rotate: '-45deg' }] },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af' },
  backText: { color: '#2563eb', marginTop: 10 },
});
