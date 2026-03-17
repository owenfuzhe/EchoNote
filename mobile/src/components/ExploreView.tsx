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
        <Text style={styles.pageSub}>围绕一个 Topic 持续获得进展、关联和思辨挑战。</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroHead}>
            <View style={styles.heroTopicRow}>
              <View style={styles.heroIconWrap}>
                <Compass size={16} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>当前 Topic</Text>
                <Text style={styles.heroTitle}>{workspace.topicLabel}</Text>
              </View>
            </View>
            <View style={[styles.heroPill, workspace.topicSource === 'custom' && styles.heroPillCustom]}>
              <Text style={[styles.heroPillText, workspace.topicSource === 'custom' && styles.heroPillTextCustom]}>
                {workspace.topicSource === 'custom' ? '手动设置' : 'AI 识别'}
              </Text>
            </View>
          </View>

          <Text style={styles.heroSummary}>{workspace.summary}</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatText}>{`${workspace.noteCount || 0} 篇已收录`}</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatText}>{`${Math.max(workspace.freshCount, workspace.noteCount ? 1 : 0)} 条进展`}</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatText}>1 个挑战</Text>
            </View>
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
          <View style={styles.relationCard}>
            <View style={styles.sectionEyebrowRow}>
              <Lightbulb size={15} color="#ca8a04" />
              <Text style={styles.sectionEyebrow}>跨笔记互补线索</Text>
            </View>
            <Text style={styles.relationTitle}>{workspace.relationCard.title}</Text>
            <Text style={styles.relationDetail}>{workspace.relationCard.detail}</Text>
            <Pressable
              style={styles.relationBtn}
              onPress={() => {
                if (workspace.relationCard.noteId) onNavigate('document', workspace.relationCard.noteId);
                else onNavigate('library');
              }}
            >
              <Text style={styles.relationBtnText}>{workspace.relationCard.actionLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>思辨挑战</Text>
          <View style={styles.challengeCard}>
            <View style={styles.challengeHead}>
              <View style={styles.challengeBadge}>
                <Sparkles size={14} color="#b91c1c" />
                <Text style={styles.challengeBadgeText}>Spar</Text>
              </View>
              <View style={styles.proPill}>
                <Text style={styles.proPillText}>Pro</Text>
              </View>
            </View>
            <Text style={styles.challengeEyebrow}>{workspace.challengeCard.eyebrow}</Text>
            <Text style={styles.challengePrompt}>{workspace.challengeCard.prompt}</Text>
            <Text style={styles.challengeHint}>体验版先进入 AI 对话，后续可升级成完整对练模式。</Text>
            <Pressable style={styles.challengeBtn} onPress={() => onOpenAIChallenge(workspace.challengePrompt)}>
              <Text style={styles.challengeBtnText}>{workspace.challengeCard.ctaLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>下一步动作</Text>
          <View style={styles.actionGrid}>
            <Pressable style={styles.actionCard} onPress={() => onNavigate('search')}>
              <Text style={styles.actionTitle}>补充更多资料</Text>
              <Text style={styles.actionDesc}>{`去搜索页继续补充“${workspace.topicLabel}”相关材料。`}</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
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
              <Text style={styles.actionTitle}>落成研究文稿</Text>
              <Text style={styles.actionDesc}>
                {templates[0] ? `用「${templates[0].template.name}」把这组线索沉淀下来。` : '把当前 Topic 整理成一份可持续更新的研究文稿。'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.bottomAddBtn} onPress={() => setTopicPickerOpen(true)}>
          <Plus size={17} color="#0f172a" />
          <Text style={styles.bottomAddText}>新建或切换 Topic</Text>
        </Pressable>
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
  pageTitle: { marginTop: 18, fontSize: 34, lineHeight: 40, color: '#0f172a', fontWeight: '900' },
  pageSub: { marginTop: 6, fontSize: 14, lineHeight: 22, color: '#64748b' },
  heroCard: {
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroTopicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  heroIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  heroTitle: { marginTop: 2, fontSize: 24, lineHeight: 30, color: '#111827', fontWeight: '900' },
  heroPill: { borderRadius: 999, backgroundColor: '#e0f2fe', paddingHorizontal: 9, paddingVertical: 5 },
  heroPillCustom: { backgroundColor: '#ede9fe' },
  heroPillText: { fontSize: 11, color: '#075985', fontWeight: '800' },
  heroPillTextCustom: { color: '#6d28d9' },
  heroSummary: { marginTop: 12, fontSize: 15, lineHeight: 24, color: '#334155', fontWeight: '600' },
  heroStats: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroStatPill: { borderRadius: 999, backgroundColor: 'white', borderWidth: 1, borderColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 7 },
  heroStatText: { fontSize: 12, color: '#1e3a8a', fontWeight: '700' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 20, color: '#111827', fontWeight: '900' },
  sectionCard: {
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7dcc5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  progressRow: {
    minHeight: 62,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressRowStatic: { opacity: 0.92 },
  progressBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60a5fa' },
  progressBody: { flex: 1 },
  progressTitle: { fontSize: 14, lineHeight: 20, color: '#111827', fontWeight: '700' },
  progressDetail: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#64748b' },
  relationCard: {
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: '#fff8e8',
    borderWidth: 1,
    borderColor: '#f5deb3',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionEyebrow: { fontSize: 13, color: '#a16207', fontWeight: '800' },
  relationTitle: { marginTop: 10, fontSize: 18, lineHeight: 26, color: '#111827', fontWeight: '800' },
  relationDetail: { marginTop: 8, fontSize: 14, lineHeight: 22, color: '#4b5563' },
  relationBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f2cc84',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  relationBtnText: { fontSize: 13, color: '#92400e', fontWeight: '800' },
  challengeCard: {
    marginTop: 10,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1d5db',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  challengeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeBadge: {
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  challengeBadgeText: { fontSize: 12, color: '#b91c1c', fontWeight: '800' },
  proPill: { borderRadius: 999, backgroundColor: '#ede9fe', paddingHorizontal: 9, paddingVertical: 5 },
  proPillText: { fontSize: 11, color: '#6d28d9', fontWeight: '800' },
  challengeEyebrow: { marginTop: 12, fontSize: 13, color: '#7f1d1d', fontWeight: '700' },
  challengePrompt: { marginTop: 8, fontSize: 15, lineHeight: 24, color: '#1f2937', fontWeight: '600' },
  challengeHint: { marginTop: 8, fontSize: 12, lineHeight: 18, color: '#9ca3af' },
  challengeBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeBtnText: { fontSize: 14, color: 'white', fontWeight: '800' },
  actionGrid: { marginTop: 10, gap: 10 },
  actionCard: {
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7dcc5',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionTitle: { fontSize: 15, color: '#111827', fontWeight: '800' },
  actionDesc: { marginTop: 6, fontSize: 13, lineHeight: 20, color: '#64748b' },
  bottomAddBtn: {
    marginTop: 22,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bottomAddText: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
});
