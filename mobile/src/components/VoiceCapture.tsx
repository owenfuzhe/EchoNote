import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Infinity, Mic, X } from 'lucide-react-native';

interface VoiceCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionComplete: (text: string) => void;
}

export default function VoiceCapture({ isOpen, onClose, onTranscriptionComplete }: VoiceCaptureProps) {
  const [mockInput, setMockInput] = useState('');

  return (
    <Modal transparent visible={isOpen} animationType="fade" onRequestClose={onClose}>
      <View style={styles.mask}>
        <Pressable style={styles.close} onPress={onClose}><X size={20} color="white" /></Pressable>
        <View style={styles.center}>
          <View style={styles.orbOuter}><View style={styles.orb}><Infinity size={48} color="white" /></View></View>
          <Text style={styles.tip}>正在倾听...（RN 版暂用文本模拟语音转录）</Text>
          <TextInput value={mockInput} onChangeText={setMockInput} placeholder="输入语音识别结果" placeholderTextColor="#9ca3af" style={styles.input} multiline />
          <Pressable style={styles.done} onPress={() => { if (mockInput.trim()) onTranscriptionComplete(mockInput.trim()); else onClose(); setMockInput(''); }}>
            <Mic size={16} color="white" /><Text style={styles.doneText}>完成转录</Text>
          </Pressable>
          <Text style={styles.bottom}>[ 点击完成结束 ]</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', paddingTop: 56 },
  close: { marginLeft: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  orbOuter: { width: 210, height: 210, borderRadius: 105, borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)', alignItems: 'center', justifyContent: 'center' },
  orb: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  tip: { color: 'rgba(255,255,255,0.75)', marginTop: 20 },
  input: { width: '100%', minHeight: 100, marginTop: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, color: '#111827' },
  done: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  doneText: { color: 'white', fontWeight: '600' },
  bottom: { color: 'rgba(255,255,255,0.55)', marginTop: 10 },
});
