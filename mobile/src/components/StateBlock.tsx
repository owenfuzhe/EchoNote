import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Inbox, Loader, LucideIcon } from 'lucide-react-native';

type StateVariant = 'loading' | 'empty' | 'error';

interface Props {
  variant: StateVariant;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

const ICON_MAP: Record<StateVariant, LucideIcon> = {
  loading: Loader,
  empty: Inbox,
  error: AlertTriangle,
};

const COLOR_MAP: Record<StateVariant, string> = {
  loading: '#2563eb',
  empty: '#9ca3af',
  error: '#ef4444',
};

export default function StateBlock({ variant, title, description, actionText, onAction }: Props) {
  const Icon = ICON_MAP[variant];
  const color = COLOR_MAP[variant];

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionText && onAction ? (
        <Pressable style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 22, paddingHorizontal: 14, alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#111827' },
  desc: { marginTop: 4, fontSize: 12, color: '#6b7280', textAlign: 'center' },
  actionBtn: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#eff6ff' },
  actionText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
});
