import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { ImageCellData } from '@/types/cell'
import { colors, font, spacing, radius } from '@/components/ui/theme'
import { useLLM } from '@/hooks/use-llm'

interface Props {
  cell: ImageCellData
  isDark: boolean
  onUpdate: (updates: Partial<ImageCellData>) => void
}

export default function ImageCell({ cell, isDark, onUpdate }: Props) {
  const theme = isDark ? colors.dark : colors.light
  const { analyzeImage } = useLLM()

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    onUpdate({ image_uri: asset.uri, is_analyzing: true })

    try {
      const base64 = asset.base64 ?? (await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      }))
      const analysis = await analyzeImage(base64)
      onUpdate({ analysis, is_analyzing: false })
    } catch (e) {
      onUpdate({ is_analyzing: false, analysis: `Analysis failed: ${e}` })
    }
  }

  if (!cell.image_uri) {
    return (
      <TouchableOpacity
        style={[styles.placeholder, { borderColor: colors.cell.image, backgroundColor: colors.cell.image + '11' }]}
        onPress={pickImage}
      >
        <Text style={styles.placeholderIcon}>🖼️</Text>
        <Text style={[styles.placeholderText, { color: colors.cell.image }]}>Tap to add image</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View>
      <Image source={{ uri: cell.image_uri }} style={styles.image} resizeMode="cover" />
      {cell.is_analyzing && (
        <View style={styles.analyzing}>
          <ActivityIndicator color={colors.cell.image} />
          <Text style={[styles.analyzingText, { color: theme.textSecondary }]}>Analyzing...</Text>
        </View>
      )}
      {cell.analysis && (
        <Text style={[styles.analysis, { color: theme.textSecondary }]}>{cell.analysis}</Text>
      )}
      <TouchableOpacity onPress={pickImage}>
        <Text style={[styles.changeBtn, { color: colors.cell.image }]}>Change image</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderIcon: { fontSize: 32 },
  placeholderText: { fontSize: font.sizes.md, fontWeight: font.weights.medium },
  image: { width: '100%', height: 200, borderRadius: radius.md },
  analyzing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  analyzingText: { fontSize: font.sizes.sm },
  analysis: { fontSize: font.sizes.sm, marginTop: spacing.sm, lineHeight: font.sizes.sm * 1.6 },
  changeBtn: { fontSize: font.sizes.sm, marginTop: spacing.sm, fontWeight: font.weights.medium },
})
