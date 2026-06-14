import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { navigationRef } from './navigationRef';
import { clearAuth } from '../auth';
import { colors } from '../theme';

import LoginScreen          from '../screens/LoginScreen';
import AdminDashboard       from '../screens/admin/DashboardScreen';
import UsersScreen          from '../screens/admin/UsersScreen';
import StockScreen          from '../screens/admin/StockScreen';
import LogsScreen           from '../screens/admin/LogsScreen';
import AdminPointsScreen    from '../screens/admin/AdminPointsScreen';
import PointDetailScreen    from '../screens/admin/PointDetailScreen';
import RatingsScreen        from '../screens/admin/RatingsScreen';
import AgentHome            from '../screens/agent/HomeScreen';
import PointsScreen         from '../screens/agent/PointsScreen';
import SellerHome           from '../screens/seller/HomeScreen';
import SellScreen           from '../screens/seller/SellScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function tabIcon(name) {
  return ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
}

function LogoutButton({ navigation }) {
  const handleLogout = () => {
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
  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
      <Ionicons name="log-out-outline" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
}

const TAB_OPTIONS = {
  tabBarActiveTintColor:   colors.primary,
  tabBarInactiveTintColor: '#999',
  tabBarStyle:             { borderTopColor: '#e0e0e0', height: 60, paddingBottom: 8 },
  tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
  headerShown:             false,
};

function AdminTabs({ navigation }) {
  const headerRight = () => <LogoutButton navigation={navigation} />;
  return (
    <Tab.Navigator screenOptions={{ ...TAB_OPTIONS, headerShown: true, headerRight }}>
      <Tab.Screen name="Dashboard" component={AdminDashboard}
        options={{ title: 'Bosh sahifa', tabBarIcon: tabIcon('home-outline') }} />
      <Tab.Screen name="Users" component={UsersScreen}
        options={{ title: 'Xodimlar', tabBarIcon: tabIcon('people-outline') }} />
      <Tab.Screen name="Stock" component={StockScreen}
        options={{ title: 'Ombor', tabBarIcon: tabIcon('layers-outline') }} />
      <Tab.Screen name="AdminPoints" component={AdminPointsScreen}
        options={{ title: 'Tochkalar', tabBarIcon: tabIcon('location-outline') }} />
      <Tab.Screen name="Ratings" component={RatingsScreen}
        options={{ title: 'Reyting', tabBarIcon: tabIcon('trophy-outline') }} />
      <Tab.Screen name="Logs" component={LogsScreen}
        options={{ title: 'Tarix', tabBarIcon: tabIcon('list-outline') }} />
    </Tab.Navigator>
  );
}

function AgentTabs({ navigation }) {
  const headerRight = () => <LogoutButton navigation={navigation} />;
  return (
    <Tab.Navigator screenOptions={{ ...TAB_OPTIONS, headerShown: true, headerRight }}>
      <Tab.Screen name="AgentHome" component={AgentHome}
        options={{ title: 'Bosh sahifa', tabBarIcon: tabIcon('home-outline') }} />
      <Tab.Screen name="Points" component={PointsScreen}
        options={{ title: 'Tochkalar', tabBarIcon: tabIcon('location-outline') }} />
    </Tab.Navigator>
  );
}

function SellerTabs({ navigation }) {
  const headerRight = () => <LogoutButton navigation={navigation} />;
  return (
    <Tab.Navigator screenOptions={{ ...TAB_OPTIONS, headerShown: true, headerRight }}>
      <Tab.Screen name="SellerHome" component={SellerHome}
        options={{ title: 'Bosh sahifa', tabBarIcon: tabIcon('home-outline') }} />
      <Tab.Screen name="Sell" component={SellScreen}
        options={{ title: 'Sotish', tabBarIcon: tabIcon('card-outline') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShown: false,
          headerRight: () => <LogoutButton navigation={navigation} />,
        })}
      >
        <Stack.Screen name="Login"      component={LoginScreen} />
        <Stack.Screen name="AdminTabs"  component={AdminTabs} />
        <Stack.Screen name="AgentTabs"  component={AgentTabs} />
        <Stack.Screen name="SellerTabs" component={SellerTabs} />
        <Stack.Screen
          name="AdminPointDetail"
          component={PointDetailScreen}
          options={({ route }) => ({
            headerShown: true,
            title: route.params?.pointName || 'Tochka',
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: '700' },
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
