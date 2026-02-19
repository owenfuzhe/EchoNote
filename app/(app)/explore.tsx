import React from 'react'
import { View, Text, StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, font, spacing } from '@/components/ui/theme'

export default function ExploreScreen() {
  const isDark = useColorScheme() === 'dark'
  const theme = isDark ? colors.dark : colors.light

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Knowledge graph & semantic connections coming soon.
        </Text>
        <Text style={styles.icon}>🔍</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          This view will show a graph of all your notes and their semantic relationships,
          powered by pgvector embeddings. You'll be able to discover hidden connections
          between your ideas.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: font.sizes.xxl, fontWeight: font.weights.bold },
  subtitle: { fontSize: font.sizes.md, textAlign: 'center' },
  icon: { fontSize: 64, marginVertical: spacing.lg },
  description: { fontSize: font.sizes.md, textAlign: 'center', lineHeight: font.sizes.md * 1.6 },
})
