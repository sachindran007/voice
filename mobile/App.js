import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Mic, History, Search } from 'lucide-react-native';

// Import Screens (Stubs for now)
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import DetailScreen from './src/screens/DetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarActiveTintColor: '#a855f7',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: {
        backgroundColor: '#0a0a14',
        borderTopColor: '#1a1a2e',
        height: 60,
        paddingBottom: 8,
      },
      headerStyle: { backgroundColor: '#0a0a14' },
      headerTintColor: '#f1f5f9',
    })}
  >
    <Tab.Screen name="Record" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Mic color={color} size={24} /> }} />
    <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: ({ color }) => <History color={color} size={24} /> }} />
    <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: ({ color }) => <Search color={color} size={24} /> }} />
  </Tab.Navigator>
);

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false, headerStyle: { backgroundColor: '#0a0a14' }, headerTintColor: '#f1f5f9' }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{ headerShown: true, title: 'Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
