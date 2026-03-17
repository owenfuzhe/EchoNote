import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Compass, Plus } from 'lucide-react-native';
import { ExploreTopicOption } from '../services/topic-workspace';

interface Props {
  visible: boolean;
  title: string;
  description: string;
  currentTopic: string;
  topicOptions: ExploreTopicOption[];
  onSelectTopic: (topic: string) => void;
  onCreateTopic: (topic: string) => void;
  onClose: () => void;
}

export default function TopicPickerSheet({
  visible,
  title,
  description,
  currentTopic,
  topicOptions,
  onSelectTopic,
  onCreateTopic,
  onClose,
}: Props) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible) setDraft('');
  }, [visible]);

  const canCreate = useMemo(() => {
    const value = draft.trim();
    return value.length >= 2 && !topicOptions.some((option) => option.label === value);
  }, [draft, topicOptions]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mask}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <Compass size={16} color="#64748b" />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="输入一个你想持续追踪的 Topic"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
            </View>
            <Pressable
              style={[styles.addBtn, !canCreate && styles.addBtnDisabled]}
              disabled={!canCreate}
              onPress={() => {
                const topic = draft.trim();
                if (!topic) return;
                onCreateTopic(topic);
                onClose();
              }}
            >
              <Plus size={16} color="white" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.topicList}>
            {topicOptions.map((option) => {
              const active = option.label === currentTopic;
              return (
                <Pressable
                  key={`${option.source}-${option.label}`}
                  style={[styles.topicRow, active && styles.topicRowActive]}
                  onPress={() => {
                    onSelectTopic(option.label);
                    onClose();
                  }}
                >
                  <View style={[styles.checkWrap, active && styles.checkWrapActive]}>
                    {active ? <Check size={13} color="white" /> : null}
                  </View>
                  <View style={styles.topicBody}>
                    <Text style={styles.topicLabel}>{option.label}</Text>
                    <Text style={styles.topicMeta}>{option.noteCount ? `${option.noteCount} 篇相关材料` : '等待第一篇相关内容'}</Text>
                  </View>
                  <View style={[styles.sourcePill, option.source === 'custom' && styles.sourcePillCustom]}>
                    <Text style={[styles.sourceText, option.source === 'custom' && styles.sourceTextCustom]}>
                      {option.source === 'custom' ? '手动' : '推荐'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.24)' },
  sheet: {
    backgroundColor: '#fffdf8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
    minHeight: 420,
    maxHeight: '80%',
  },
  handle: { alignSelf: 'center', width: 46, height: 5, borderRadius: 999, backgroundColor: '#e7e5e4' },
  title: { marginTop: 14, fontSize: 22, color: '#111827', fontWeight: '900' },
  desc: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  inputRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  inputWrap: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e7dcc5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: '#111827', fontSize: 14 },
  addBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: '#d6d3d1' },
  topicList: { paddingTop: 14, gap: 10, paddingBottom: 10 },
  topicRow: {
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ede7da',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicRowActive: { borderColor: '#111827', backgroundColor: '#fffaf0' },
  checkWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkWrapActive: { backgroundColor: '#111827', borderColor: '#111827' },
  topicBody: { flex: 1 },
  topicLabel: { fontSize: 15, color: '#111827', fontWeight: '700' },
  topicMeta: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  sourcePill: {
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourcePillCustom: { backgroundColor: '#ede9fe' },
  sourceText: { fontSize: 11, color: '#92400e', fontWeight: '800' },
  sourceTextCustom: { color: '#6d28d9' },
});
