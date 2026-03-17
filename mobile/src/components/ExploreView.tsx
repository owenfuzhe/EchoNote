import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronRight, Compass, Lightbulb, Plus, Sparkles } from 'lucide-react-native';
import { buildTopicWorkspace, getExploreTopicOptions } from '../services/topic-workspace';
import { getTemplateContent, recommendTemplates, recordTemplateUsage } from '../services/template-recommender';
import { useNoteStore } from '../store/noteStore';
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

  const topicOptions = useMemo(() => getExploreTopicOptions(notes, customTopics), [notes, customTopics]);
  const workspace = useMemo(() => buildTopicWorkspace(notes, currentTopic, customTopics), [notes, currentTopic, customTopics]);
  const templates = useMemo(() => recommendTemplates(workspace.matchedNotes.length ? workspace.matchedNotes : notes, 2), [notes, workspace.matchedNotes]);

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

        <Text style={styles.pageTitle}>深度探索</Text>
        <Text style={styles.pageSub}>围绕一个 Topic，先看清进展，再决定要不要继续深入。</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroTopicRow}>
            <View style={styles.heroIconWrap}>
              <Compass size={16} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>{workspace.topicSource === 'custom' ? '手动设置的 Topic' : 'AI 识别出的 Topic'}</Text>
              <Text style={styles.heroTitle}>{workspace.topicLabel}</Text>
            </View>
          </View>
          <Text style={styles.heroSummary}>{workspace.summary}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta}>
              {`${workspace.noteCount || 0} 篇材料 · ${Math.max(workspace.freshCount, workspace.noteCount ? 1 : 0)} 条进展`}
            </Text>
            <Pressable onPress={() => setTopicPickerOpen(true)}>
              <Text style={styles.heroMetaLink}>调整 Topic</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>今日进展</Text>
          <View style={styles.sectionCard}>
            {workspace.progressItems.map((item) => {
              const interactive = !!item.noteId;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.progressRow, !interactive && styles.progressRowStatic]}
                  onPress={interactive ? () => onNavigate('document', item.noteId) : undefined}
                  disabled={!interactive}
                >
                  <View style={styles.progressBullet} />
                  <View style={styles.progressBody}>
                    <Text style={styles.progressTitle}>{item.title}</Text>
                    <Text style={styles.progressDetail}>{item.detail}</Text>
                  </View>
                  {interactive ? <ChevronRight size={16} color="#94a3b8" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关联视角</Text>
          <View style={styles.quietCard}>
            <View style={styles.inlineLabelRow}>
              <Lightbulb size={15} color="#ca8a04" />
              <Text style={styles.inlineLabel}>跨笔记互补线索</Text>
            </View>
            <Text style={styles.relationTitle}>{workspace.relationCard.title}</Text>
            <Text style={styles.relationDetail}>{workspace.relationCard.detail}</Text>
            <Pressable
              style={styles.inlineAction}
              onPress={() => {
                if (workspace.relationCard.noteId) onNavigate('document', workspace.relationCard.noteId);
                else onNavigate('library');
              }}
            >
              <Text style={styles.inlineActionText}>{workspace.relationCard.actionLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>思辨挑战</Text>
          <View style={styles.quietCard}>
            <View style={styles.challengeHead}>
              <View style={styles.inlineLabelRow}>
                <Sparkles size={14} color="#b91c1c" />
                <Text style={styles.inlineLabel}>Spar</Text>
              </View>
              <Text style={styles.challengePro}>Pro</Text>
            </View>
            <Text style={styles.challengeEyebrow}>{workspace.challengeCard.eyebrow}</Text>
            <Text style={styles.challengePrompt}>{workspace.challengeCard.prompt}</Text>
            <Pressable style={styles.inlineAction} onPress={() => onOpenAIChallenge(workspace.challengePrompt)}>
              <Text style={styles.inlineActionText}>{workspace.challengeCard.ctaLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footerActions}>
          <Pressable style={styles.footerGhostBtn} onPress={() => onNavigate('search')}>
            <Text style={styles.footerGhostText}>补充更多资料</Text>
          </Pressable>

          <Pressable
            style={styles.footerGhostBtn}
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
            <Text style={styles.footerGhostText}>沉淀成文稿</Text>
          </Pressable>

          <Pressable style={styles.bottomAddBtn} onPress={() => setTopicPickerOpen(true)}>
            <Plus size={17} color="#0f172a" />
            <Text style={styles.bottomAddText}>切换 Topic</Text>
          </Pressable>
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
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 140 },
  emptyScreen: { flex: 1, backgroundColor: '#fcfaf5', paddingHorizontal: 18, justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  topicSwitchBtn: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicSwitchText: { fontSize: 13, color: '#334155', fontWeight: '700' },
  pageTitle: { marginTop: 18, fontSize: 30, lineHeight: 36, color: '#0f172a', fontWeight: '900' },
  pageSub: { marginTop: 6, fontSize: 14, lineHeight: 22, color: '#64748b' },
  heroCard: {
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  heroTopicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  heroIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  heroTitle: { marginTop: 2, fontSize: 22, lineHeight: 28, color: '#111827', fontWeight: '800' },
  heroSummary: { marginTop: 12, fontSize: 15, lineHeight: 23, color: '#334155' },
  heroMetaRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroMeta: { fontSize: 12, color: '#94a3b8' },
  heroMetaLink: { fontSize: 12, color: '#475569', fontWeight: '700' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 17, color: '#111827', fontWeight: '800' },
  sectionCard: {
    marginTop: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  progressRow: {
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressRowStatic: { opacity: 0.92 },
  progressBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60a5fa' },
  progressBody: { flex: 1 },
  progressTitle: { fontSize: 14, lineHeight: 20, color: '#111827', fontWeight: '700' },
  progressDetail: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#64748b' },
  quietCard: {
    marginTop: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inlineLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  relationTitle: { marginTop: 10, fontSize: 16, lineHeight: 22, color: '#111827', fontWeight: '700' },
  relationDetail: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#4b5563' },
  inlineAction: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 4 },
  inlineActionText: { fontSize: 13, color: '#334155', fontWeight: '700' },
  challengeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengePro: { fontSize: 11, color: '#9ca3af', fontWeight: '700' },
  challengeEyebrow: { marginTop: 10, fontSize: 12, color: '#64748b', fontWeight: '700' },
  challengePrompt: { marginTop: 8, fontSize: 15, lineHeight: 23, color: '#1f2937' },
  footerActions: { marginTop: 22, gap: 10 },
  footerGhostBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerGhostText: { fontSize: 14, color: '#334155', fontWeight: '700' },
  bottomAddBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bottomAddText: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
});
