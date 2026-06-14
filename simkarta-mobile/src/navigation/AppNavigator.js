import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import AdminDashboard from '../screens/admin/DashboardScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import StockScreen from '../screens/admin/StockScreen';
import AgentHome from '../screens/agent/HomeScreen';
import PointsScreen from '../screens/agent/PointsScreen';
import SellerHome from '../screens/seller/HomeScreen';
import SellScreen from '../screens/seller/SellScreen';

import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="Dashboard" component={AdminDashboard} options={{ title: 'Bosh sahifa' }} />
      <Tab.Screen name="Users" component={UsersScreen} options={{ title: 'Xodimlar' }} />
      <Tab.Screen name="Stock" component={StockScreen} options={{ title: 'Ombor' }} />
    </Tab.Navigator>
  );
}

function AgentTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="AgentHome" component={AgentHome} options={{ title: 'Bosh sahifa' }} />
      <Tab.Screen name="Points" component={PointsScreen} options={{ title: 'Nuqtalar' }} />
    </Tab.Navigator>
  );
}

function SellerTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="SellerHome" component={SellerHome} options={{ title: 'Bosh sahifa' }} />
      <Tab.Screen name="Sell" component={SellScreen} options={{ title: 'Sotish' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="AgentTabs" component={AgentTabs} />
        <Stack.Screen name="SellerTabs" component={SellerTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
