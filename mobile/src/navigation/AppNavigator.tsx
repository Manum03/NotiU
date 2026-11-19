import React from 'react';
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
import type { Subject } from '../features/subjects/types';

export type RootStackParamList = {
  Tasks: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Subjects: undefined;
  SubjectDetail: { subject: Subject };
  AddSubject: { subjectId?: string } | undefined;
  AddTask: {
  type?: 'tarea' | 'recordatorio' | 'nota' | 'checklist';
  taskId?: string;
} | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome">
          {({ navigation }) => (
            <WelcomeScreen
              onLogin={() => navigation.navigate('Login')}
              onRegister={() => navigation.navigate('Register')}
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
            />
          )}
        </Stack.Screen>

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Subjects" component={SubjectsScreen} />
        <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
        <Stack.Screen name="AddSubject" component={AddSubjectScreen} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="Tasks" component={RemindersScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
