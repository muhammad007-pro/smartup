import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { navigationRef } from './navigationRef';
import { clearAuth } from '../auth';
import { useTheme } from '../ThemeContext';
import api from '../api';

import LoginScreen           from '../screens/LoginScreen';
import AdminDashboard        from '../screens/admin/DashboardScreen';
import UsersScreen           from '../screens/admin/UsersScreen';
import StockScreen           from '../screens/admin/StockScreen';
import LogsScreen            from '../screens/admin/LogsScreen';
import AdminPointsScreen     from '../screens/admin/AdminPointsScreen';
import PointDetailScreen     from '../screens/admin/PointDetailScreen';
import RatingsScreen         from '../screens/admin/RatingsScreen';
import NotificationsScreen   from '../screens/admin/NotificationsScreen';
import AgentHome             from '../screens/agent/HomeScreen';
import PointsScreen          from '../screens/agent/PointsScreen';
import SellerHome            from '../screens/seller/HomeScreen';
import SellScreen            from '../screens/seller/SellScreen';
import SalesHistoryScreen    from '../screens/SalesHistoryScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

export function useLogout(navigation) {
  return () => {
    Alert.alert('Chiqish', 'Tizimdan chiqmoqchimisiz?', [
      { text: 'Bekor', style: 'cancel' },
      {
        text: 'Chiqish', style: 'destructive',
        onPress: async () => {
          await clearAuth();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };
}

function tabIcon(name) {
  return ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
}

function AdminTabs() {
  const { theme } = useTheme();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications/unread_count');
        setUnread(res.data.count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabStyle = {
    headerShown:             false,
    tabBarActiveTintColor:   theme.primary,
    tabBarInactiveTintColor: theme.textMuted,
    tabBarStyle: {
      backgroundColor: theme.tabBg,
      borderTopColor:  theme.tabBorder,
      borderTopWidth:  1,
      height:          62,
      paddingBottom:   10,
      paddingTop:      4,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
  };

  return (
    <Tab.Navigator screenOptions={tabStyle}>
      <Tab.Screen name="Dashboard"      component={AdminDashboard}    options={{ title: 'Bosh',         tabBarIcon: tabIcon('home-outline')          }} />
      <Tab.Screen name="Users"          component={UsersScreen}        options={{ title: 'Xodimlar',     tabBarIcon: tabIcon('people-outline')        }} />
      <Tab.Screen name="Stock"          component={StockScreen}        options={{ title: 'Ombor',        tabBarIcon: tabIcon('layers-outline')        }} />
      <Tab.Screen name="AdminPoints"    component={AdminPointsScreen}  options={{ title: 'Tochkalar',    tabBarIcon: tabIcon('location-outline')      }} />
      <Tab.Screen name="Ratings"        component={RatingsScreen}      options={{ title: 'Reyting',      tabBarIcon: tabIcon('trophy-outline')        }} />
      <Tab.Screen name="Notifications"  component={NotificationsScreen} options={{
        title: 'Xabarlar',
        tabBarIcon: tabIcon('notifications-outline'),
        tabBarBadge: unread > 0 ? unread : undefined,
        tabBarBadgeStyle: { fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
      }} />
      <Tab.Screen name="Logs"           component={LogsScreen}         options={{ title: 'Tarix',        tabBarIcon: tabIcon('list-outline')          }} />
    </Tab.Navigator>
  );
}

function AgentTabs() {
  const { theme } = useTheme();
  const tabStyle = {
    headerShown:             false,
    tabBarActiveTintColor:   theme.primary,
    tabBarInactiveTintColor: theme.textMuted,
    tabBarStyle: {
      backgroundColor: theme.tabBg,
      borderTopColor:  theme.tabBorder,
      borderTopWidth:  1,
      height:          62,
      paddingBottom:   10,
      paddingTop:      4,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
  };
  return (
    <Tab.Navigator screenOptions={tabStyle}>
      <Tab.Screen name="AgentHome" component={AgentHome}    options={{ title: 'Bosh sahifa', tabBarIcon: tabIcon('home-outline')     }} />
      <Tab.Screen name="Points"    component={PointsScreen} options={{ title: 'Tochkalar',   tabBarIcon: tabIcon('location-outline') }} />
    </Tab.Navigator>
  );
}

function SellerTabs() {
  const { theme } = useTheme();
  const tabStyle = {
    headerShown:             false,
    tabBarActiveTintColor:   theme.primary,
    tabBarInactiveTintColor: theme.textMuted,
    tabBarStyle: {
      backgroundColor: theme.tabBg,
      borderTopColor:  theme.tabBorder,
      borderTopWidth:  1,
      height:          62,
      paddingBottom:   10,
      paddingTop:      4,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
  };
  return (
    <Tab.Navigator screenOptions={tabStyle}>
      <Tab.Screen name="SellerHome"         component={SellerHome}         options={{ title: 'Bosh sahifa', tabBarIcon: tabIcon('home-outline')     }} />
      <Tab.Screen name="Sell"               component={SellScreen}         options={{ title: 'Sotish',      tabBarIcon: tabIcon('card-outline')     }} />
      <Tab.Screen name="SellerPoints"       component={AdminPointsScreen}  initialParams={{ readOnly: true }}    options={{ title: 'Tochkalar',   tabBarIcon: tabIcon('location-outline') }} />
      <Tab.Screen name="SellerRatings"      component={RatingsScreen}      initialParams={{ sellerMode: true }}  options={{ title: 'Reyting',    tabBarIcon: tabIcon('trophy-outline')   }} />
      <Tab.Screen name="SellerSalesHistory" component={SalesHistoryScreen} initialParams={{ sellerMode: true }}  options={{ title: 'Tarix',      tabBarIcon: tabIcon('time-outline')     }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"      component={LoginScreen} />
        <Stack.Screen name="AdminTabs"  component={AdminTabs}   />
        <Stack.Screen name="AgentTabs"  component={AgentTabs}   />
        <Stack.Screen name="SellerTabs" component={SellerTabs}  />
        <Stack.Screen
          name="AdminPointDetail"
          component={PointDetailScreen}
          options={({ route }) => ({
            headerShown: true,
            title: route.params?.pointName || 'Tochka',
            headerStyle:      { backgroundColor: theme.primary },
            headerTintColor:  '#fff',
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          })}
        />
        <Stack.Screen
          name="SalesHistory"
          component={SalesHistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            headerShown: true,
            title: 'Bildirishnomalar',
            headerStyle:      { backgroundColor: theme.primary },
            headerTintColor:  '#fff',
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
