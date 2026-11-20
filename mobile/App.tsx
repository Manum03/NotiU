
import { StatusBar } from 'expo-status-bar';

import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';

// Se importa cada estilo por separado para que la app solo incluya las fuentes que usa
import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';
import { Roboto_700Bold } from '@expo-google-fonts/roboto/700Bold';

// Playfair Display: textos descriptivos (guía de identidad visual del README)
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';

import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    PlayfairDisplay_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
