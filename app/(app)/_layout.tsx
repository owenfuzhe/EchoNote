import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'
import { colors } from '@/components/ui/theme'

export default function AppLayout() {
  const isDark = useColorScheme() === 'dark'
  const theme = isDark ? colors.dark : colors.light

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Notebooks', tabBarIcon: ({ color }) => <TabIcon icon="📓" color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <TabIcon icon="🔍" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }} />
      <Tabs.Screen name="notebook/[id]" options={{ href: null }} />
    </Tabs>
  )
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}
