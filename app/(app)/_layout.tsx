import { Tabs, useRouter } from 'expo-router'
import { useColorScheme, View, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { colors } from '@/components/ui/theme'

export default function AppLayout() {
  const isDark = useColorScheme() === 'dark'
  const theme = isDark ? colors.dark : colors.light
  const router = useRouter()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 80,
          paddingBottom: 20,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Notes', 
          tabBarIcon: ({ color }) => <TabIcon icon="📝" color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="explore" 
        options={{ 
          title: 'Explore', 
          tabBarIcon: ({ color }) => <TabIcon icon="🧭" color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="create" 
        options={{ 
          title: '',
          tabBarButton: () => (
            <CreateButton onPress={() => router.push('/(app)/create')} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: 'Me', 
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} /> 
        }} 
      />
      <Tabs.Screen name="notebook/[id]" options={{ href: null }} />
      <Tabs.Screen name="topic-map" options={{ href: null }} />
    </Tabs>
  )
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}

function CreateButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={styles.createButton}
      activeOpacity={0.8}
    >
      <View style={styles.buttonInner}>
        <Text style={styles.buttonText}>+</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  createButton: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 80,
    paddingTop: 10,
  },
  buttonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 32,
  },
})
