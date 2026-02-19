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

export default function SettingsScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light

  const { activeProviderId, providers, setActiveProvider, updateProviderModel, updateProviderBaseUrl, voiceLanguage, setVoiceLanguage, voiceTranscriptionProvider, setVoiceTranscriptionProvider } = useSettingsStore()

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Settings</Text>

        {/* Active Provider */}
        <Section title="Active AI Provider" theme={theme}>
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
                  <Text style={[styles.localBadge, { color: colors.cell.voice }]}>local</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Per-provider config */}
        {(Object.keys(PROVIDER_META) as LLMProviderId[]).map((id) => (
          <ProviderConfig key={id} providerId={id} isDark={isDark} theme={theme} />
        ))}

        {/* Voice settings */}
        <Section title="Voice Language" theme={theme}>
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
                  {lang === 'auto' ? 'Auto' : lang === 'zh' ? '中文' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            "Auto" detects Chinese and English automatically.
          </Text>
        </Section>

        <Section title="Voice Transcription Provider" theme={theme}>
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
                  {provider === 'openai_whisper' ? 'OpenAI Whisper' : 'GLM ASR'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.textTertiary }]}>
            Select the speech-to-text service to use. Remember to save the corresponding API key below.
          </Text>
        </Section>

        {/* Sign out */}
        <TouchableOpacity style={[styles.signOutBtn, { borderColor: '#EF4444' }]} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title.toUpperCase()}</Text>
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
    Alert.alert('Saved', `${meta.name} API key saved.`)
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

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Model</Text>
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
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save key</Text>}
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
  pageTitle: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold, marginBottom: spacing.sm },
  section: { gap: spacing.xs },
  sectionTitle: { fontSize: font.sizes.xs, fontWeight: font.weights.semibold, paddingLeft: spacing.sm },
  sectionBody: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  providerChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  providerChipText: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  localBadge: { fontSize: font.sizes.xs },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  segmentText: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  hint: { fontSize: font.sizes.xs, marginTop: spacing.xs },
  signOutBtn: { borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  signOutText: { color: '#EF4444', fontWeight: font.weights.semibold },
  expandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expandLabel: { fontSize: font.sizes.md, fontWeight: font.weights.medium },
  fieldLabel: { fontSize: font.sizes.sm, fontWeight: font.weights.medium },
  input: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, fontSize: font.sizes.sm },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  modelChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  modelChipText: { fontSize: font.sizes.xs },
  saveBtn: { padding: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: font.weights.semibold },
})
