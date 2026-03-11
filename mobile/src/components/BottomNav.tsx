import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
}

export default function BottomNav({ currentView, onNavigate, onCaptureMenu, onSelectSkill, onSearch }: BottomNavProps) {
  const [showSkillsDial, setShowSkillsDial] = useState(false);
  const insets = useSafeAreaInsets();

  const NavBtn = ({ active, children, onPress }: any) => (
    <Pressable onPress={onPress} style={[styles.navBtn, active && styles.navBtnActive]}>{children}</Pressable>
  );

  return (
    <>
      <View style={[styles.wrap, { bottom: Math.max(12, insets.bottom + 8) }]} pointerEvents="box-none">
        <View style={styles.leftPill}>
          <NavBtn active={currentView === 'home'} onPress={() => onNavigate('home')}><Home size={22} color={currentView === 'home' ? '#2563eb' : '#6b7280'} /></NavBtn>
          <NavBtn active={currentView === 'library'} onPress={() => onNavigate('library')}><BookOpen size={22} color={currentView === 'library' ? '#2563eb' : '#6b7280'} /></NavBtn>
          <NavBtn active={currentView === 'search'} onPress={onSearch}><Search size={22} color={currentView === 'search' ? '#2563eb' : '#6b7280'} /></NavBtn>
          <NavBtn active={currentView === 'explore'} onPress={() => onNavigate('explore')}><Lightbulb size={22} color={currentView === 'explore' ? '#2563eb' : '#6b7280'} /></NavBtn>
        </View>
        <View style={styles.rightPill}>
          <Pressable onPress={() => setShowSkillsDial(true)} style={styles.aiBtn}><Infinity size={20} color="white" /></Pressable>
          <Pressable onPress={onCaptureMenu} style={styles.addBtn}><Plus size={18} color="#374151" /></Pressable>
        </View>
      </View>
      <SkillsDial isOpen={showSkillsDial} onClose={() => setShowSkillsDial(false)} onSelectSkill={(id) => { setShowSkillsDial(false); onSelectSkill?.(id); }} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' },
  leftPill: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 999, padding: 6, gap: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  rightPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  navBtn: { width: 52, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navBtnActive: { backgroundColor: '#eff6ff' },
  aiBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
});
