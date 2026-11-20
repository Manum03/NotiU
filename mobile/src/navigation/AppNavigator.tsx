import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../features/auth/screens/WelcomeScreen';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import HomeScreen from '../features/home/screens/HomeScreen';
import SubjectsScreen from '../features/subjects/screens/SubjectsScreen';
import SubjectDetailScreen from '../features/subjects/screens/SubjectDetailScreen';
import AddSubjectScreen from '../features/subjects/screens/AddSubjectScreen';
import AddTaskScreen from '../features/tasks/screens/AddTaskScreen';
import RemindersScreen from '../features/tasks/screens/RemindersScreen';
import ConnectMoodleScreen from '../features/integrations/screens/ConnectMoodleScreen';
import type { Subject } from '../features/subjects/types';
import { useAuth } from '../features/auth/hooks/useAuth';
import { navigationRef } from './navigationRef';

export type RootStackParamList = {
  Tasks: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Subjects: undefined;
  SubjectDetail: { subject: Subject };
  AddSubject: { subjectId?: string } | undefined;
  ConnectMoodle: undefined;
  AddTask: {
  type?: 'tarea' | 'recordatorio' | 'nota' | 'checklist';
  taskId?: string;
} | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Pantallas que se pueden ver sin sesión
const AUTH_ROUTES: (keyof RootStackParamList)[] = ['Welcome', 'Login', 'Register'];

export default function AppNavigator() {
  // Sesión de Firebase: decide la pantalla inicial y detecta cuando se cierra
  const { user, initializing } = useAuth();

  // Si la sesión termina (logout o sesión revocada) estando dentro de la app,
  // se vuelve a la bienvenida. El login sigue navegando como antes (onLoginSuccess).
  useEffect(() => {
    if (initializing || user || !navigationRef.isReady()) return;
    const current = navigationRef.getCurrentRoute()?.name;
    if (current && !AUTH_ROUTES.includes(current)) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
  }, [user, initializing]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#10060A', justifyContent: 'center' }}>
        <ActivityIndicator color="#AA0330" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        // Solo se lee al montar: con sesión guardada se entra directo al Home
        initialRouteName={user ? 'Home' : 'Welcome'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome">
          {({ navigation }) => (
            <WelcomeScreen
              onLogin={() => navigation.navigate('Login')}
              onRegister={() => navigation.navigate('Register')}
              onGoogleSuccess={() => navigation.replace('Home')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onBack={() => navigation.goBack()}
              onRegister={() => navigation.navigate('Register')}
              onLoginSuccess={() => navigation.replace('Home')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Register">
          {({ navigation }) => (
            <RegisterScreen
              onBack={() => navigation.goBack()}
              onLogin={() => navigation.navigate('Login')}
              onGoogleSuccess={() => navigation.replace('Home')}
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Subjects" component={SubjectsScreen} />
        <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
        <Stack.Screen name="AddSubject" component={AddSubjectScreen} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="Tasks" component={RemindersScreen} />
        <Stack.Screen name="ConnectMoodle" component={ConnectMoodleScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
