import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, I18nManager } from 'react-native';
import { useAuthStore } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';

import LoginScreen from '../screens/auth/LoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ChildrenScreen from '../screens/children/ChildrenScreen';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import DailyReportsScreen from '../screens/daily-reports/DailyReportsScreen';
import MessagesScreen from '../screens/messaging/MessagesScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function MainTabs() {
  const { t, isRTL } = useI18n();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4 }, tabBarLabelStyle: { fontSize: 10 }, tabBarActiveTintColor: '#059669' }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: t.dashboard, tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarLabel: t.attendance, tabBarIcon: ({ focused }) => <TabIcon icon="✓" focused={focused} /> }} />
      <Tab.Screen name="DailyReports" component={DailyReportsScreen} options={{ tabBarLabel: t.dailyReports, tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarLabel: t.messages, tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t.profile, tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuthStore();
  const { isRTL } = useI18n();

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' }}><Text style={{ fontSize: 32 }}>🌳</Text></View>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Children" component={ChildrenScreen} options={{ headerShown: true, title: 'Children' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
