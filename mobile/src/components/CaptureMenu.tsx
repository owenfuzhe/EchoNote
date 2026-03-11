import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowRight, Clipboard, FileText, Globe, Image as ImageIcon, Link2, Loader, Music, X, Youtube } from 'lucide-react-native';

interface CaptureMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onFileCapture: (type: 'pdf' | 'audio') => void;
  onImageCapture: () => void;
  onLinkCapture: (url?: string) => void;
  onYoutubeCapture: (url: string) => void;
  onTextCapture: (text: string) => void;
  isLoading?: boolean;
}

export default function CaptureMenu({ isOpen, onClose, onFileCapture, onImageCapture, onLinkCapture, onYoutubeCapture, onTextCapture, isLoading = false }: CaptureMenuProps) {
  const [urlInput, setUrlInput] = useState('');
  const [activeMode, setActiveMode] = useState<'url' | 'youtube' | null>(null);

  const submit = () => {
    if (!urlInput.trim()) return;
    if (activeMode === 'youtube') onYoutubeCapture(urlInput.trim());
    else onLinkCapture(urlInput.trim());
    setUrlInput('');
    setActiveMode(null);
  };

  const Item = ({ id, label, desc, icon: Icon, color, onPress }: any) => (
    <Pressable style={styles.row} onPress={onPress} disabled={isLoading}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}20` }]}><Icon size={18} color={color} /></View>
      <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.rowDesc}>{desc}</Text></View>
      <ArrowRight size={16} color="#9ca3af" />
    </Pressable>
  );

  return (
    <Modal transparent visible={isOpen} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.panel}>
          <View style={styles.header}><Text style={styles.title}>生成音频概览时参考网站</Text><Pressable onPress={onClose} style={styles.close}><X size={18} color="#6b7280" /></Pressable></View>
          <View style={styles.inputWrap}>
            <Link2 size={18} color="#9ca3af" />
            <TextInput value={urlInput} onChangeText={setUrlInput} placeholder={activeMode === 'youtube' ? '输入 YouTube 链接...' : '从网上查找来源...'} style={styles.input} autoCapitalize="none" />
            <Pressable onPress={submit} style={[styles.go, (!urlInput.trim() || isLoading) && { backgroundColor: '#e5e7eb' }]}>
              {isLoading ? <Loader size={16} color="#9ca3af" /> : <ArrowRight size={16} color={urlInput.trim() ? 'white' : '#9ca3af'} />}
            </Pressable>
          </View>
          <Text style={styles.sep}>或上传文件</Text>
          <View style={{ gap: 8 }}>
            <Item id="pdf" label="PDF" desc="上传 PDF 文件" icon={FileText} color="#ef4444" onPress={() => onFileCapture('pdf')} />
            <Item id="audio" label="音频" desc="上传音频文件" icon={Music} color="#a855f7" onPress={() => onFileCapture('audio')} />
            <Item id="image" label="图片" desc="上传图片文件" icon={ImageIcon} color="#22c55e" onPress={onImageCapture} />
            <Item id="website" label="网站" desc="抓取网页内容" icon={Globe} color="#3b82f6" onPress={() => setActiveMode('url')} />
            <Item id="youtube" label="YouTube" desc="输入 YouTube 链接" icon={Youtube} color="#f43f5e" onPress={() => setActiveMode('youtube')} />
            <Item id="text" label="复制的文字" desc="粘贴文字内容" icon={Clipboard} color="#f59e0b" onPress={() => onTextCapture('请手动粘贴文字内容')} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { width: '100%', maxWidth: 420, backgroundColor: 'white', borderRadius: 24, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', maxWidth: '88%' },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  go: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6' },
  sep: { marginVertical: 12, alignSelf: 'center', color: '#9ca3af', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f9fafb', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowDesc: { fontSize: 12, color: '#9ca3af' },
});
