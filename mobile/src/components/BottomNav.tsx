import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Home, Infinity, Lightbulb, Plus, Search } from 'lucide-react-native';
import SkillsDial from './SkillsDial';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onCaptureMenu?: () => void;
  onSelectSkill?: (skillId: string) => void;
  onSearch?: () => void;
  onAIVoiceCapture?: () => void;
}

interface NavItemProps {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}

export default function BottomNav({ currentView, onNavigate, onCaptureMenu, onSelectSkill, onSearch, onAIVoiceCapture }: BottomNavProps) {
  const [showSkillsDial, setShowSkillsDial] = useState(false);
  const longPressTriggeredRef = useRef(false);
  const insets = useSafeAreaInsets();

  const NavItem = ({ active, label, icon, onPress }: NavItemProps) => (
    <Pressable onPress={onPress} style={[styles.navBtn, active && styles.navBtnActive]}>
      {icon}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <View style={[styles.wrap, { bottom: Math.max(12, insets.bottom + 8) }]} pointerEvents="box-none">
        <View style={styles.leftPill}>
          <NavItem
            active={currentView === 'home'}
            label="主页"
            onPress={() => onNavigate('home')}
            icon={<Home size={18} color={currentView === 'home' ? '#2563eb' : '#6b7280'} />}
          />
          <NavItem
            active={currentView === 'library'}
            label="资料"
            onPress={() => onNavigate('library')}
            icon={<BookOpen size={18} color={currentView === 'library' ? '#2563eb' : '#6b7280'} />}
          />
          <NavItem
            active={currentView === 'explore'}
            label="探索"
            onPress={() => onNavigate('explore')}
            icon={<Lightbulb size={18} color={currentView === 'explore' ? '#2563eb' : '#6b7280'} />}
          />
          <NavItem
            active={currentView === 'search'}
            label="搜索"
            onPress={onSearch}
            icon={<Search size={18} color={currentView === 'search' ? '#2563eb' : '#6b7280'} />}
          />
        </View>

        <View style={styles.rightPill}>
          <Pressable
            onPressIn={() => { longPressTriggeredRef.current = false; }}
            onLongPress={() => {
              longPressTriggeredRef.current = true;
              onAIVoiceCapture?.();
            }}
            delayLongPress={220}
            onPress={() => {
              if (longPressTriggeredRef.current) {
                longPressTriggeredRef.current = false;
                return;
              }
              setShowSkillsDial(true);
            }}
            style={styles.aiBtn}
          >
            <Infinity size={19} color="white" />
          </Pressable>
          <Pressable onPress={onCaptureMenu} style={styles.addBtn}><Plus size={18} color="#374151" /></Pressable>
        </View>
      </View>

      <SkillsDial
        isOpen={showSkillsDial}
        onClose={() => setShowSkillsDial(false)}
        onSelectSkill={(id) => {
          setShowSkillsDial(false);
          onSelectSkill?.(id);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between' },
  leftPill: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb', flex: 1, marginRight: 10, justifyContent: 'space-between' },
  rightPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  navBtn: { width: 58, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navBtnActive: { backgroundColor: '#eff6ff' },
  navLabel: { marginTop: 2, fontSize: 10, color: '#6b7280', fontWeight: '500' },
  navLabelActive: { color: '#2563eb' },
  aiBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
});
