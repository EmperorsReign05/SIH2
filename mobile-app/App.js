import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import NetInfo from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DataCollectionScreen from './src/screens/DataCollectionScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import OfflineDataScreen from './src/screens/OfflineDataScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CameraScreen from './src/screens/CameraScreen';

// Components
import Icon from 'react-native-vector-icons/MaterialIcons';

// Context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// React Query setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Data Collection') {
            iconName = 'add-circle';
          } else if (route.name === 'Projects') {
            iconName = 'list';
          } else if (route.name === 'Offline') {
            iconName = 'cloud-off';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Data Collection" component={DataCollectionScreen} />
      <Tab.Screen name="Projects" component={ProjectListScreen} />
      <Tab.Screen name="Offline" component={OfflineDataScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Main App Component
const AppContent = () => {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="Camera" 
              component={CameraScreen}
              options={{
                headerShown: true,
                title: 'Take Photo',
                headerBackTitle: 'Back'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Root App Component
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AuthProvider>
          <OfflineProvider>
            <AppContent />
            <Toast />
          </OfflineProvider>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default App;
