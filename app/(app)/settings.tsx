import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, useColorScheme, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import {
  useSettingsStore,
  saveProviderApiKey,
  loadProviderApiKey,
} from '@/store/settings-store'
import { LLMProviderId, PROVIDER_META } from '@/providers/llm/types'
import { colors, spacing, radius, font } from '@/components/ui/theme'

export default function MeScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ notebooks: 0, cells: 0, todos: 0 })

  const { activeProviderId, providers, setActiveProvider, updateProviderModel, updateProviderBaseUrl, voiceLanguage, setVoiceLanguage, voiceTranscriptionProvider, setVoiceTranscriptionProvider } = useSettingsStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    loadStats()
  }, [])

  const loadStats = async () => {
    const [notebooksRes, cellsRes] = await Promise.all([
      supabase.from('notebooks').select('id', { count: 'exact' }),
      supabase.from('cells').select('id, type', { count: 'exact' }),
    ])
    const todoCount = cellsRes.data?.filter(c => c.type === 'todo')?.length || 0
    setStats({
      notebooks: notebooksRes.count || 0,
      cells: cellsRes.count || 0,
      todos: todoCount,
    })
  }

  const handleSignOut = async () => {
    Alert.alert('退出登录', '确定要退出吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>个人中心</Text>

        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.emailText, { color: theme.text }]}>{user?.email || '加载中...'}</Text>
            <Text style={[styles.joinDate, { color: theme.textSecondary }]}>
              加入于 {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
            </Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.notebooks}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>笔记</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.cells}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>内容</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.todos}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>待办</Text>
          </View>
        </View>

        <Section title="AI 模型设置" theme={theme}>
          <View style={styles.providerGrid}>
            {(Object.keys(PROVIDER_META) as LLMProviderId[]).map((id) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.providerChip,
                  { borderColor: theme.border, backgroundColor: theme.surfaceAlt },
                  activeProviderId === id && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => setActiveProvider(id)}
              >
                <Text style={[styles.providerChipText, { color: activeProviderId === id ? colors.primary : theme.text }]}>
                  {PROVIDER_META[id].name}
                </Text>
                {PROVIDER_META[id].isLocal && (
                  <Text style={[styles.localBadge, { color: colors.cell.voice }]}>本地</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {(Object.keys(PROVIDER_META) as LLMProviderId[]).map((id) => (
          <ProviderConfig key={id} providerId={id} isDark={isDark} theme={theme} />
        ))}

        <Section title="语音设置" theme={theme}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>识别语言</Text>
            <View style={styles.segmentRow}>
              {(['auto', 'zh', 'en'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.segment,
                    { borderColor: theme.border },
                    voiceLanguage === lang && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setVoiceLanguage(lang)}
                >
                  <Text style={[styles.segmentText, { color: voiceLanguage === lang ? '#fff' : theme.text }]}>
                    {lang === 'auto' ? '自动' : lang === 'zh' ? '中文' : '英文'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: spacing.md, marginTop: spacing.md }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>转录服务</Text>
            <View style={styles.segmentRow}>
              {(['openai_whisper', 'zai_asr'] as const).map((provider) => (
                <TouchableOpacity
                  key={provider}
                  style={[
                    styles.segment,
                    { borderColor: theme.border },
                    voiceTranscriptionProvider === provider && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setVoiceTranscriptionProvider(provider)}
                >
                  <Text style={[styles.segmentText, { color: voiceTranscriptionProvider === provider ? '#fff' : theme.text }]}>
                    {provider === 'openai_whisper' ? 'Whisper' : 'GLM'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        <Section title="关于" theme={theme}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: theme.text }]}>版本</Text>
            <Text style={[styles.aboutValue, { color: theme.textSecondary }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <Text style={[styles.aboutLabel, { color: theme.text }]}>Echo Notes</Text>
            <Text style={[styles.aboutValue, { color: theme.textSecondary }]}>AI 知识管理助手</Text>
          </View>
        </Section>

        <TouchableOpacity style={[styles.signOutBtn, { borderColor: '#EF4444' }]} onPress={handleSignOut}>
          <Text style={styles.signOutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  )
}

function ProviderConfig({ providerId, isDark, theme }: { providerId: LLMProviderId; isDark: boolean; theme: any }) {
  const meta = PROVIDER_META[providerId]
  const { providers, updateProviderModel, updateProviderBaseUrl } = useSettingsStore()
  const config = providers[providerId]
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadProviderApiKey(providerId).then((k) => setApiKey(k ?? ''))
  }, [providerId])

  const handleSave = async () => {
    setSaving(true)
    await saveProviderApiKey(providerId, apiKey)
    setSaving(false)
    Alert.alert('保存成功', `${meta.name} API Key 已保存`)
  }

  return (
    <Section title={meta.name} theme={theme}>
      <TouchableOpacity style={styles.expandHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.expandLabel, { color: theme.text }]}>{meta.name}</Text>
        <Text style={{ color: theme.textTertiary }}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {!meta.isLocal && (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>API Key</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder={`${meta.name} API key`}
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}

          {meta.isLocal && (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Base URL</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={config.baseUrl ?? 'http://localhost:11434'}
                onChangeText={(v) => updateProviderBaseUrl(providerId, v)}
                placeholder="http://localhost:11434"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
              />
            </>
          )}

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>模型</Text>
          <View style={styles.modelRow}>
            {meta.models.map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.modelChip,
                  { borderColor: theme.border },
                  config.model === m && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => updateProviderModel(providerId, m)}
              >
                <Text style={[styles.modelChipText, { color: config.model === m ? colors.primary : theme.text }]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!meta.isLocal && (
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>保存</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </Section>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 60 },
  pageTitle: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold, marginBottom: spacing.md },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: font.sizes.xl, fontWeight: font.weights.bold },
  profileInfo: { marginLeft: spacing.md, flex: 1 },
  emailText: { fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  joinDate: { fontSize: font.sizes.xs, marginTop: spacing.xs },
  statsCard: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%' },
  statValue: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
  statLabel: { fontSize: font.sizes.xs, marginTop: spacing.xs },
  section: { gap: spacing.xs },
  sectionTitle: { fontSize: font.sizes.xs, fontWeight: font.weights.semibold, paddingLeft: spacing.sm },
  sectionBody: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  providerChipText: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  localBadge: { fontSize: font.sizes.xs, marginLeft: spacing.xs },
  settingRow: {},
  settingLabel: { fontSize: font.sizes.sm, fontWeight: font.weights.medium, marginBottom: spacing.sm },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  segmentText: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  aboutLabel: { fontSize: font.sizes.sm },
  aboutValue: { fontSize: font.sizes.sm },
  signOutBtn: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  signOutText: { color: '#EF4444', fontWeight: font.weights.semibold },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandLabel: { fontSize: font.sizes.md, fontWeight: font.weights.medium },
  fieldLabel: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, fontSize: font.sizes.sm },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  modelChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  modelChipText: { fontSize: font.sizes.xs },
  saveBtn: { padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontWeight: font.weights.semibold },
})
