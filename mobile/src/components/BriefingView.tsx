import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, BookOpen, ChevronRight, Headphones, Link2 } from 'lucide-react-native';
import { useNoteStore } from '../store/noteStore';
import { buildBriefing, getBriefingNotes } from '../services/briefing';
import { AppView } from '../types';

interface Props {
  onNavigate: (view: AppView, noteId?: string) => void;
  selectedNoteIds: string[];
}

export default function BriefingView({ onNavigate, selectedNoteIds }: Props) {
  const { notes } = useNoteStore();
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const pickedNotes = useMemo(() => getBriefingNotes(notes, selectedNoteIds), [notes, selectedNoteIds]);
  const briefing = useMemo(() => buildBriefing(pickedNotes), [pickedNotes]);

  if (!pickedNotes.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>还没有可生成简报的内容</Text>
        <Text style={styles.emptyDesc}>先导入几篇最近内容，再回到首页生成这期深读简报。</Text>
        <Pressable style={styles.backBtn} onPress={() => onNavigate('home')}>
          <Text style={styles.backBtnText}>返回首页</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backIconBtn} onPress={() => onNavigate('home')}>
            <ArrowLeft size={18} color="#0f172a" />
            <Text style={styles.backIconText}>返回</Text>
          </Pressable>

          <Pressable
            style={styles.proPill}
            onPress={() => Alert.alert('升级为播客', '播客版简报将作为 Pro 功能开放，并带有额度提示。')}
          >
            <Headphones size={14} color="#0f172a" />
            <Text style={styles.proPillText}>升级为播客</Text>
            <Text style={styles.proQuota}>Pro</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{briefing.title}</Text>
        <Text style={styles.meta}>{`${briefing.dateLabel} · ${briefing.coverageLabel}`}</Text>

        <View style={styles.summaryBlock}>
          <Text style={styles.sectionEyebrow}>一句话核心摘要</Text>
          <Text style={styles.summaryText}>{briefing.oneLiner}</Text>
        </View>

        <View style={styles.analysisBlock}>
          <Text style={styles.sectionEyebrow}>深度解析</Text>
          {briefing.sections.map((section, index) => (
            <View key={section.id} style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIndex}>{`${String(index + 1).padStart(2, '0')}.`}</Text>
                <View style={styles.sectionTitleWrap}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSource}>{section.source}</Text>
                </View>
              </View>
              <Text style={styles.sectionBullet}>{`• 核心观点：${section.insight}`}</Text>
              <Text style={styles.sectionBullet}>{`• ${section.action}`}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.sourcesBtn} onPress={() => setSourcesOpen(true)}>
          <Link2 size={15} color="#0f172a" />
          <Text style={styles.sourcesBtnText}>{`查看 ${briefing.notes.length} 篇原文链接`}</Text>
          <ChevronRight size={16} color="#64748b" />
        </Pressable>

        <View style={styles.proHintCard}>
          <Headphones size={16} color="#7c2d12" />
          <View style={styles.proHintTextWrap}>
            <Text style={styles.proHintTitle}>播客版简报预留为 Pro 能力</Text>
            <Text style={styles.proHintDesc}>后续会在这里接入语音播报与额度提示，先保留升级入口。</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={sourcesOpen} transparent animationType="slide" onRequestClose={() => setSourcesOpen(false)}>
        <View style={styles.sheetMask}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSourcesOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>本期收录内容</Text>
            <Text style={styles.sheetDesc}>点击任意条目，跳转到原文笔记继续阅读。</Text>

            {briefing.notes.map((note) => (
              <Pressable
                key={note.id}
                style={styles.sourceRow}
                onPress={() => {
                  setSourcesOpen(false);
                  onNavigate('document', note.id);
                }}
              >
                <View style={styles.sourceRowIcon}>
                  <BookOpen size={16} color="#1d4ed8" />
                </View>
                <View style={styles.sourceRowBody}>
                  <Text numberOfLines={2} style={styles.sourceRowTitle}>{note.title}</Text>
                  <Text style={styles.sourceRowMeta}>{briefing.dateLabel}</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf5' },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIconText: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  proPill: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9e7bd',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#f3d28a',
  },
  proPillText: { fontSize: 13, color: '#0f172a', fontWeight: '700' },
  proQuota: {
    fontSize: 11,
    color: '#7c2d12',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '800',
  },
  title: { marginTop: 18, fontSize: 34, lineHeight: 42, color: '#0f172a', fontWeight: '900' },
  meta: { marginTop: 8, fontSize: 14, color: '#64748b', fontWeight: '600' },
  summaryBlock: {
    marginTop: 22,
    borderRadius: 24,
    backgroundColor: '#fff8eb',
    borderWidth: 1,
    borderColor: '#efd8ac',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  analysisBlock: {
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7dcc5',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  sectionEyebrow: { fontSize: 15, color: '#92400e', fontWeight: '800' },
  summaryText: { marginTop: 10, fontSize: 18, lineHeight: 30, color: '#292524', fontWeight: '600' },
  sectionCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: '#fcfaf5',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ede3cf',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sectionIndex: { fontSize: 18, color: '#a16207', fontWeight: '800', width: 34 },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontSize: 17, lineHeight: 24, color: '#111827', fontWeight: '800' },
  sectionSource: { marginTop: 3, fontSize: 12, color: '#78716c', fontWeight: '600' },
  sectionBullet: { marginTop: 10, fontSize: 15, lineHeight: 23, color: '#1f2937' },
  sourcesBtn: {
    marginTop: 18,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sourcesBtnText: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  proHintCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#fff3e6',
    borderWidth: 1,
    borderColor: '#f4cf9f',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  proHintTextWrap: { flex: 1 },
  proHintTitle: { fontSize: 14, color: '#7c2d12', fontWeight: '800' },
  proHintDesc: { marginTop: 5, fontSize: 13, lineHeight: 19, color: '#9a3412' },
  sheetMask: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.24)' },
  sheet: {
    backgroundColor: '#fffdf8',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    minHeight: 320,
  },
  sheetHandle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 999, backgroundColor: '#e7e5e4' },
  sheetTitle: { marginTop: 14, fontSize: 22, color: '#111827', fontWeight: '900' },
  sheetDesc: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  sourceRow: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ede7da',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceRowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  sourceRowBody: { flex: 1 },
  sourceRowTitle: { fontSize: 14, lineHeight: 20, color: '#111827', fontWeight: '700' },
  sourceRowMeta: { marginTop: 3, fontSize: 12, color: '#94a3b8' },
  emptyWrap: { flex: 1, backgroundColor: '#fcfaf5', paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#111827', fontWeight: '900' },
  emptyDesc: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center' },
  backBtn: {
    marginTop: 18,
    height: 44,
    minWidth: 120,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  backBtnText: { fontSize: 14, color: 'white', fontWeight: '800' },
});
