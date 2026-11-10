
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';

import {
  PlayfairDisplay_400Regular,
} from '@expo-google-fonts/playfair-display';

import WelcomeScreen from './src/features/auth/screens/WelcomeScreen';
import LoginScreen from './src/features/auth/screens/LoginScreen';
import RegisterScreen from './src/features/auth/screens/RegisterScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    PlayfairDisplay_400Regular,
  });

  const [currentScreen, setCurrentScreen] = useState<
    'welcome' | 'login' | 'register'
  >('welcome');
  console.log('Pantalla actual:', currentScreen);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />

      {currentScreen === 'welcome' && (
        <WelcomeScreen
          onLogin={() => setCurrentScreen('login')}
          onRegister={() => setCurrentScreen('register')}
        />
      )}

      {currentScreen === 'login' && (
        <LoginScreen
          onBack={() => setCurrentScreen('welcome')}
          onRegister={() => setCurrentScreen('register')}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen
          onBack={() => setCurrentScreen('welcome')}
          onLogin={() => setCurrentScreen('login')}
        />
      )}
    </>
  );
}
