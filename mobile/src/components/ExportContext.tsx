import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Rocket, X } from 'lucide-react-native';
import { Note } from '../types';
import { richTextToPlainText } from '../utils/richText';

interface Props {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportContext({ notes, isOpen, onClose }: Props) {
  const [format, setFormat] = useState<'json' | 'markdown'>('json');
  const [copied, setCopied] = useState(false);

  const exportJson = useMemo(() => {
    return {
      meta: {
        exportedAt: new Date().toISOString(),
        app: 'EchoNote',
        version: '2.0',
        noteCount: notes.length,
      },
      contextGraph: {
        nodes: notes.map((note) => ({
          id: note.id,
          type: note.type,
          title: note.title,
          content: richTextToPlainText(note.content).slice(0, 500),
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
      },
      summary: {
        totalNotes: notes.length,
        topTags: getTopTags(notes),
        timeRange: getTimeRange(notes),
      },
    };
  }, [notes]);

  const exportContent = useMemo(() => {
    if (format === 'json') return JSON.stringify(exportJson, null, 2);
    return generateMarkdown(exportJson);
  }, [format, exportJson]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (!isOpen) return null;

  return (
    <Modal transparent visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.badge}><Rocket size={18} color="white" /></View>
            <View>
              <Text style={styles.title}>Export Context</Text>
              <Text style={styles.sub}>{notes.length} notes · {format.toUpperCase()}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.close}><X size={18} color="#6b7280" /></Pressable>
        </View>

        <View style={styles.switchRow}>
          <Pressable style={[styles.switchBtn, format === 'json' && styles.switchBtnOn]} onPress={() => setFormat('json')}><Text style={[styles.switchText, format === 'json' && styles.switchTextOn]}>JSON</Text></Pressable>
          <Pressable style={[styles.switchBtn, format === 'markdown' && styles.switchBtnOn]} onPress={() => setFormat('markdown')}><Text style={[styles.switchText, format === 'markdown' && styles.switchTextOn]}>Markdown</Text></Pressable>
        </View>

        <ScrollView style={styles.preview} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.previewText}>{exportContent.slice(0, 2400)}{exportContent.length > 2400 ? '\n\n... (truncated)' : ''}</Text>
        </ScrollView>

        <Pressable onPress={handleCopy} style={styles.copyBtn}>
          {copied ? <Check size={16} color="white" /> : <Copy size={16} color="white" />}
          <Text style={styles.copyText}>{copied ? '已复制' : '复制到剪贴板'}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function getTopTags(notes: Note[]) {
  const m: Record<string, number> = {};
  notes.forEach((note) => (note.tags || []).forEach((tag) => { m[tag] = (m[tag] || 0) + 1; }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
}

function getTimeRange(notes: Note[]) {
  if (!notes.length) return 'N/A';
  const times = notes.map((n) => new Date(n.createdAt).getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  return `${min.toLocaleDateString()} - ${max.toLocaleDateString()}`;
}

function generateMarkdown(data: any) {
  let md = `# EchoNote Context Export\n\n`;
  md += `**Exported:** ${new Date(data.meta.exportedAt).toLocaleString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Total Notes:** ${data.summary.totalNotes}\n`;
  md += `- **Top Tags:** ${data.summary.topTags.join(', ') || 'None'}\n`;
  md += `- **Time Range:** ${data.summary.timeRange}\n\n`;
  md += `## Notes\n\n`;
  data.contextGraph.nodes.forEach((node: any, idx: number) => {
    md += `### ${idx + 1}. ${node.title}\n\n`;
    md += `**Type:** ${node.type}\n\n`;
    md += `**Tags:** ${node.tags?.join(', ') || 'None'}\n\n`;
    md += `**Content:**\n\n${node.content}\n\n---\n\n`;
  });
  return md;
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { backgroundColor: 'white', maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sub: { marginTop: 2, fontSize: 12, color: '#9ca3af' },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  switchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  switchBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f3f4f6' },
  switchBtnOn: { backgroundColor: '#3b82f6' },
  switchText: { color: '#4b5563', fontWeight: '600' },
  switchTextOn: { color: 'white' },
  preview: { marginTop: 10, marginHorizontal: 14, borderRadius: 12, backgroundColor: '#f8fafc', maxHeight: 320 },
  previewText: { color: '#374151', fontSize: 12, lineHeight: 17 },
  copyBtn: { marginTop: 12, marginHorizontal: 14, height: 46, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  copyText: { color: 'white', fontWeight: '700' },
});
