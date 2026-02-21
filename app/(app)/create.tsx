import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNotebookStore } from '@/store/notebook-store'
import { COVER_COLORS, CoverColor } from '@/types/notebook'
import { colors, spacing, radius, font } from '@/components/ui/theme'
import { useLinkParser } from '@/hooks/use-link-parser'

export default function CreateScreen() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  const { createNotebook, addCell, updateCell, persistCell } = useNotebookStore()
  const [mode, setMode] = useState<'select' | 'link'>('select')
  const [newColor, setNewColor] = useState<CoverColor>('#6366F1')
  const [creating, setCreating] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  
  const { parseUrl, loading: parsingLink } = useLinkParser()

  // 页面获得焦点时重置状态
  useFocusEffect(
    useCallback(() => {
      setCreating(false)
      setMode('select')
      setLinkUrl('')
    }, [])
  )

  const handleQuickNote = async () => {
    // 速记：直接创建空白笔记并进入详情页
    setCreating(true)
    try {
      const now = new Date()
      const title = `速记 ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
      const id = await createNotebook(title, newColor)
      router.replace(`/(app)/notebook/${id}`)
    } catch (error) {
      console.error('Create quick note error:', error)
      setCreating(false)
    }
  }

  const handleCreateLink = async () => {
    if (!linkUrl.trim()) return

    setCreating(true)
    try {
      let normalizedUrl = linkUrl.trim()
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl
      }
      
      const parsed = await parseUrl(normalizedUrl)
      const title = parsed?.title || new URL(normalizedUrl).hostname
      
      const id = await createNotebook(title, newColor)
      
      const cell = await addCell(id, 'link')
      updateCell(cell.id, { 
        url: normalizedUrl, 
        title: parsed?.title || title,
        favicon: null,
        content: parsed?.content || null,
        published_time: parsed?.publishedTime || null,
      })
      await persistCell({ 
        ...cell, 
        url: normalizedUrl, 
        title: parsed?.title || title,
        content: parsed?.content || null,
        published_time: parsed?.publishedTime || null,
      } as any)

      router.replace(`/(app)/notebook/${id}`)
    } catch (error) {
      console.error('Create link error:', error)
      setCreating(false)
    }
  }

  const handleBack = () => {
    if (mode === 'link') {
      setMode('select')
      setLinkUrl('')
    } else {
      router.back()
    }
  }

  // 选择模式
  if (mode === 'select') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>新建笔记</Text>
          <View style={styles.backButton} />
        </View>

        {/* Type Selection */}
        <View style={styles.typeSelection}>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            选择创建方式
          </Text>
          
          <View style={styles.typeGrid}>
            <TouchableOpacity
              style={[styles.typeCard, { backgroundColor: theme.surface }]}
              onPress={handleQuickNote}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.typeIcon}>⚡</Text>
                  <Text style={[styles.typeTitle, { color: theme.text }]}>速记</Text>
                  <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                    快速记录想法
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, { backgroundColor: theme.surface }]}
              onPress={() => setMode('link')}
            >
              <Text style={styles.typeIcon}>🔗</Text>
              <Text style={[styles.typeTitle, { color: theme.text }]}>链接</Text>
              <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                保存网页链接
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, { backgroundColor: theme.surface, opacity: 0.5 }]}
              onPress={() => {}}
            >
              <Text style={styles.typeIcon}>🖼️</Text>
              <Text style={[styles.typeTitle, { color: theme.text }]}>图片</Text>
              <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                即将上线
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeCard, { backgroundColor: theme.surface, opacity: 0.5 }]}
              onPress={() => {}}
            >
              <Text style={styles.typeIcon}>📄</Text>
              <Text style={[styles.typeTitle, { color: theme.text }]}>文档</Text>
              <Text style={[styles.typeDesc, { color: theme.textSecondary }]}>
                即将上线
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // 链接模式
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>保存链接</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          网页链接
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: theme.border,
          }]}
          placeholder="https://..."
          placeholderTextColor={theme.textTertiary}
          value={linkUrl}
          onChangeText={setLinkUrl}
          autoFocus
          autoCapitalize="none"
          keyboardType="url"
        />
        {parsingLink && (
          <View style={styles.parsingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.parsingText, { color: theme.textSecondary }]}>
              正在解析链接...
            </Text>
          </View>
        )}

        <Text style={[styles.label, { color: theme.textSecondary, marginTop: spacing.lg }]}>
          选择颜色
        </Text>
        <View style={styles.colorGrid}>
          {COVER_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                newColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setNewColor(color)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            { 
              backgroundColor: colors.primary,
              opacity: creating || !linkUrl.trim() ? 0.5 : 1,
            },
          ]}
          onPress={handleCreateLink}
          disabled={creating || !linkUrl.trim()}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>创建笔记</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.semibold,
  },
  typeSelection: {
    flex: 1,
    padding: spacing.xl,
  },
  subtitle: {
    fontSize: font.sizes.md,
    marginBottom: spacing.lg,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  typeIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  typeTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    marginBottom: spacing.xs,
  },
  typeDesc: {
    fontSize: font.sizes.sm,
  },
  formContainer: {
    flex: 1,
    padding: spacing.xl,
  },
  label: {
    fontSize: font.sizes.sm,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.sizes.md,
  },
  parsingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  parsingText: {
    fontSize: font.sizes.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButton: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
})
