import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { exploreTopic, getCachedTopicExplore, type ExploreQuestionsResult } from '../services/ai-actions';
import { buildTopicWorkspace, getExploreTopicOptions } from '../services/topic-workspace';
import { getTemplateContent, recommendTemplates, recordTemplateUsage } from '../services/template-recommender';
import { useNoteStore } from '../store/noteStore';
import { mobileType } from '../theme/typography';
import { AppView } from '../types';
import StateBlock from './StateBlock';
import TopicPickerSheet from './TopicPickerSheet';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  currentTopic: string;
  customTopics: string[];
  onSelectTopic: (topic: string) => void;
  onCreateTopic: (topic: string) => void;
  onOpenAIChallenge: (prompt: string) => void;
}

export default function ExploreView({
  onNavigate,
  currentTopic,
  customTopics,
  onSelectTopic,
  onCreateTopic,
  onOpenAIChallenge,
}: Props) {
  const { notes, createNote } = useNoteStore();
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [aiReloadTick, setAiReloadTick] = useState(0);
  const [aiState, setAiState] = useState<{
    loading: boolean;
    stale: boolean;
    error: string;
    result: ExploreQuestionsResult | null;
  }>({
    loading: false,
    stale: false,
    error: '',
    result: null,
  });

  const topicOptions = useMemo(() => getExploreTopicOptions(notes, customTopics), [notes, customTopics]);
  const workspace = useMemo(() => buildTopicWorkspace(notes, currentTopic, customTopics), [notes, currentTopic, customTopics]);
  const templates = useMemo(() => recommendTemplates(workspace.matchedNotes.length ? workspace.matchedNotes : notes, 2), [notes, workspace.matchedNotes]);
  const aiSourceNotes = useMemo(() => {
    return workspace.matchedNotes.length ? workspace.matchedNotes : notes.slice(0, 4);
  }, [notes, workspace.matchedNotes]);

  useEffect(() => {
    if (!notes.length || !currentTopic.trim()) return;

    let cancelled = false;

    const load = async () => {
      const cached = await getCachedTopicExplore(currentTopic, aiSourceNotes);
      if (cancelled) return;

      setAiState({
        loading: true,
        stale: Boolean(cached),
        error: '',
        result: cached,
      });

      try {
        const result = await exploreTopic(currentTopic, aiSourceNotes);
        if (cancelled) return;

        setAiState({
          loading: false,
          stale: false,
          error: '',
          result,
        });
      } catch (error: any) {
        if (cancelled) return;

        setAiState((current) => ({
          loading: false,
          stale: Boolean(current.result || cached),
          error: error?.message || 'AI 追问暂时不可用',
          result: current.result || cached,
        }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentTopic, aiSourceNotes, notes.length, aiReloadTick]);

  if (!notes.length) {
    return (
      <View style={styles.emptyScreen}>
        <StateBlock
          variant="empty"
          title="还没有可探索的内容"
          description="先导入几条笔记或链接，再回来建立你的第一个 Topic。"
          actionText="去资料库"
          onAction={() => onNavigate('library')}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => onNavigate('home')}>
            <ArrowLeft size={18} color="#0f172a" />
            <Text style={styles.backText}>返回</Text>
          </Pressable>
          <Pressable style={styles.topicSwitchBtn} onPress={() => setTopicPickerOpen(true)}>
            <Text style={styles.topicSwitchText}>切换 Topic</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>深度探索</Text>
        <Text style={styles.topicTitle}>{workspace.topicLabel}</Text>
        <Text style={styles.topicSummary}>{workspace.summary}</Text>

        <View style={styles.topicMetaRow}>
          <Text style={styles.topicMeta}>
            {`${workspace.topicSource === 'custom' ? '手动 Topic' : '自动识别 Topic'} · ${workspace.noteCount || 0} 篇材料 · ${Math.max(
              workspace.freshCount,
              workspace.noteCount ? 1 : 0
            )} 条进展`}
          </Text>
          <Pressable onPress={() => setTopicPickerOpen(true)}>
            <Text style={styles.topicMetaLink}>调整</Text>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>最新进展</Text>
          {workspace.progressItems.map((item, index) => {
            const interactive = !!item.noteId;
            return (
              <Pressable
                key={item.id}
                style={[styles.progressRow, index > 0 && styles.rowDivider, !interactive && styles.progressRowStatic]}
                onPress={interactive ? () => onNavigate('document', item.noteId) : undefined}
                disabled={!interactive}
              >
                <Text style={styles.progressIndex}>{`${String(index + 1).padStart(2, '0')}`}</Text>
                <View style={styles.progressBody}>
                  <Text style={styles.progressTitle}>{item.title}</Text>
                  <Text style={styles.progressDetail}>{item.detail}</Text>
                </View>
                {interactive ? <ChevronRight size={16} color="#94a3b8" /> : null}
              </Pressable>
            );
          })}

          <View style={[styles.contextRow, styles.rowDivider]}>
            <Text style={styles.contextLabel}>关联线索</Text>
            <Pressable
              style={styles.contextLink}
              onPress={() => {
                if (workspace.relationCard.noteId) onNavigate('document', workspace.relationCard.noteId);
                else onNavigate('library');
              }}
            >
              <Text style={styles.contextLinkTitle}>{workspace.relationCard.title}</Text>
              <Text style={styles.contextLinkDetail}>{workspace.relationCard.detail}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLabel}>
              <Sparkles size={14} color="#b91c1c" />
              <Text style={styles.sectionLabel}>AI 追问</Text>
            </View>
            {aiState.loading ? (
              <View style={styles.challengeStatusWrap}>
                <ActivityIndicator size="small" color="#64748b" />
                <Text style={styles.challengeStatusText}>{aiState.stale ? '正在刷新' : '正在生成'}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.challengeHook}>{aiState.result?.hook || workspace.challengeCard.eyebrow}</Text>

          {(aiState.result?.questions?.length ? aiState.result.questions : [workspace.challengeCard.prompt]).map((question, index) => (
            <Pressable
              key={`${index}-${question.slice(0, 16)}`}
              style={[styles.questionRow, index > 0 && styles.rowDivider]}
              onPress={() => onOpenAIChallenge(question)}
            >
              <Text style={styles.questionText}>{question}</Text>
              <ChevronRight size={16} color="#94a3b8" />
            </Pressable>
          ))}

          <View style={[styles.nextStepRow, styles.rowDivider]}>
            <Text style={styles.nextStepLabel}>建议下一步</Text>
            <Text style={styles.nextStepText}>{aiState.result?.nextStep || workspace.challengePrompt}</Text>
          </View>

          {aiState.error ? (
            <View style={styles.challengeErrorRow}>
              <Text style={styles.challengeErrorText}>{aiState.error}</Text>
              <Pressable style={styles.challengeRetryBtn} onPress={() => setAiReloadTick((value) => value + 1)}>
                <Text style={styles.challengeRetryText}>重试</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.footerActions}>
          <Pressable
            style={styles.primaryAction}
            onPress={() => onOpenAIChallenge(aiState.result?.nextStep || workspace.challengePrompt)}
          >
            <Text style={styles.primaryActionText}>继续和 AI 讨论</Text>
          </Pressable>

          <View style={styles.inlineActionsRow}>
            <Pressable style={styles.inlineAction} onPress={() => onNavigate('search')}>
              <Text style={styles.inlineActionText}>补充更多资料</Text>
            </Pressable>

            <Pressable
              style={styles.inlineAction}
              onPress={async () => {
                const template = templates[0]?.template;
                if (!template) return;
                await recordTemplateUsage(template.id);
                const noteId = await createNote({
                  title: `${template.name} - ${workspace.topicLabel}`,
                  content: `${getTemplateContent(template)}\n\n## 当前 Topic\n- ${workspace.topicLabel}`,
                  type: 'text',
                  tags: ['模板', workspace.topicLabel],
                });
                onNavigate('document', noteId);
              }}
            >
              <Text style={styles.inlineActionText}>沉淀成文稿</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <TopicPickerSheet
        visible={topicPickerOpen}
        title="设置深度探索 Topic"
        description="选一个你想长期追踪的问题空间。系统会围绕它整理进展、关联和挑战。"
        currentTopic={workspace.topicLabel}
        topicOptions={topicOptions}
        onSelectTopic={onSelectTopic}
        onCreateTopic={onCreateTopic}
        onClose={() => setTopicPickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fcfaf5' },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 140 },
  emptyScreen: { flex: 1, backgroundColor: '#fcfaf5', paddingHorizontal: 18, justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  topicSwitchBtn: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: '#f7f4ee',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ece7dd',
  },
  topicSwitchText: { fontSize: 13, color: '#44403c', fontWeight: '700' },
  eyebrow: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 16,
    color: '#8b7d6b',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  topicTitle: { ...mobileType.screenTitle, marginTop: 10, fontSize: 32, lineHeight: 38 },
  topicSummary: { marginTop: 12, fontSize: 16, lineHeight: 26, color: '#475569' },
  topicMetaRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  topicMeta: { flex: 1, fontSize: 13, lineHeight: 18, color: '#94a3b8' },
  topicMetaLink: { fontSize: 12, lineHeight: 18, color: '#334155', fontWeight: '700' },
  sectionBlock: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#ece7dd',
  },
  sectionLabel: { fontSize: 12, lineHeight: 16, color: '#8b7d6b', fontWeight: '700', letterSpacing: 0.4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionHeadLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressRow: {
    minHeight: 66,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  progressRowStatic: { opacity: 0.92 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#f1ece3' },
  progressIndex: { width: 24, fontSize: 12, lineHeight: 18, color: '#9a8c78', fontWeight: '800' },
  progressBody: { flex: 1 },
  progressTitle: { fontSize: 16, lineHeight: 23, color: '#111827', fontWeight: '700' },
  progressDetail: { marginTop: 4, fontSize: 14, lineHeight: 21, color: '#64748b' },
  contextRow: { paddingTop: 16 },
  contextLabel: { fontSize: 12, lineHeight: 16, color: '#8b7d6b', fontWeight: '700', letterSpacing: 0.3 },
  contextLink: { marginTop: 10 },
  contextLinkTitle: { fontSize: 15, lineHeight: 22, color: '#111827', fontWeight: '700' },
  contextLinkDetail: { marginTop: 6, fontSize: 14, lineHeight: 21, color: '#64748b' },
  challengeStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeStatusText: { fontSize: 12, lineHeight: 16, color: '#64748b', fontWeight: '600' },
  challengeHook: { marginTop: 12, fontSize: 15, lineHeight: 24, color: '#475569' },
  questionRow: {
    minHeight: 54,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questionText: { flex: 1, fontSize: 16, lineHeight: 24, color: '#111827', fontWeight: '600' },
  nextStepRow: { paddingTop: 16 },
  nextStepLabel: { fontSize: 12, lineHeight: 16, color: '#8b7d6b', fontWeight: '700', letterSpacing: 0.3 },
  nextStepText: { marginTop: 8, fontSize: 15, lineHeight: 24, color: '#1f2937' },
  challengeErrorRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  challengeErrorText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#b45309' },
  challengeRetryBtn: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeRetryText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  footerActions: { marginTop: 28, gap: 12 },
  primaryAction: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { fontSize: 15, color: '#ffffff', fontWeight: '700' },
  inlineActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  inlineAction: {
    minHeight: 40,
    borderRadius: 14,
    backgroundColor: '#f7f4ee',
    borderWidth: 1,
    borderColor: '#ece7dd',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionText: { fontSize: 13, color: '#44403c', fontWeight: '700' },
});
