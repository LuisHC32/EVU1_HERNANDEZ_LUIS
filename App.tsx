import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TasksProvider } from './src/context/TasksContext';
import { TaskFormScreen } from './src/screens/TaskFormScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { theme } from './src/theme/theme';
import type { RootStackParamList } from './src/types/navigation';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider
        theme={theme}
        settings={{
          icon: ({ name, color, size, direction }) => (
            <MaterialCommunityIcons
              name={name as IconName}
              color={color}
              size={size}
              style={{ transform: [{ scaleX: direction === 'rtl' ? -1 : 1 }] }}
            />
          ),
        }}
      >
        <TasksProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="TaskList" component={TaskListScreen} />
              <Stack.Screen name="TaskForm" component={TaskFormScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </TasksProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
