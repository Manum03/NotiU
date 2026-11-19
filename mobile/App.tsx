
import { StatusBar } from 'expo-status-bar';

import {
  useFonts,
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';

import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';

import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
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
