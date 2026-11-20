
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Lucide } from '@react-native-vector-icons/lucide';

import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';

import {
  Image,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

// Inicio de sesión con Firebase (la sesión queda guardada automáticamente).
import {
  getAuthErrorMessage,
  loginWithEmail,
  sendPasswordReset,
} from '../../../services/auth/authService';
import GoogleButton from '../components/GoogleButton';

type Props = {
  onBack: () => void;
  onRegister: () => void;
  onLoginSuccess: () => void;
};

export default function LoginScreen({
  onBack,
  onRegister,
  onLoginSuccess,
}: Props) {

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

  // Estado para evitar varios intentos simultáneos.
  const [loading, setLoading] = useState(false);

  // Controla el inicio de sesión.
  const handleLogin = async () => {

    // Validar que todos los campos estén completos.
      if (!email.trim() || !password.trim()) {
        Alert.alert('Campos incompletos', 'Por favor, completa tu correo electrónico y contraseña.'
            );
        return;
        }

    try {
      setLoading(true);

      // Firebase valida el correo y la contraseña; luego el backend confirma
      // la sesión con GET /auth/me (y crea el usuario la primera vez).
      await loginWithEmail(email.trim().toLowerCase(), password);

      // Continuar hacia el Home únicamente después de iniciar sesión.
      onLoginSuccess();

    } catch (error: unknown) {
      console.error('Error al iniciar sesión:', error);

      Alert.alert('No se pudo iniciar sesión', getAuthErrorMessage(error));

    } finally {
      setLoading(false);
    }
  };

  // Envía el correo de recuperación de contraseña de Firebase.
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Escribe tu correo',
        'Ingresa tu correo electrónico arriba y vuelve a tocar "¿Olvidaste tu contraseña?".'
      );
      return;
    }

    try {
      await sendPasswordReset(email.trim().toLowerCase());
      Alert.alert(
        'Revisa tu correo',
        'Si existe una cuenta con ese correo, te enviamos un enlace para cambiar la contraseña.'
      );
    } catch (error: unknown) {
      Alert.alert('No se pudo enviar el correo', getAuthErrorMessage(error));
    }
  };

  return (
    <View style={styles.container}>

      {/* RESPLANDOR CIRCULAR */}
      <View style={styles.glowContainer} pointerEvents="none">
        <Svg width={650} height={650} viewBox="0 0 650 650">
          <Defs>
            <RadialGradient id="loginGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#AA0330" stopOpacity="0.8" />
              <Stop offset="35%" stopColor="#800427" stopOpacity="0.5" />
              <Stop offset="70%" stopColor="#4E021A" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#10060A" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle
            cx="325"
            cy="325"
            r="325"
            fill="url(#loginGlow)"
          />
        </Svg>
      </View>

      {/* BOTÓN VOLVER */}
      <Pressable onPress={onBack} style={styles.backButton}>
        <Lucide name="arrow-left" size={21} color="#E9DDD3" />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* LOGO */}
        <Image
          source={require('../../../assets/images/logonotiU.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* NOMBRE */}
        <Text style={styles.brand}>
          Noti<Text style={{ color: '#AA0330' }}>U</Text>
        </Text>

        <Text style={styles.title}>inicia sesión</Text>

        <Text style={styles.subtitle}>Para continuar.</Text>

        {/* FORMULARIO */}
        <View style={styles.form}>

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            placeholder="Ejemplo@correo.com"
            placeholderTextColor="#9C777D"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#9C777D"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          {/* RECUPERAR CONTRASEÑA */}
          <Pressable onPress={handleForgotPassword} disabled={loading}>
            <Text style={[styles.link, { alignSelf: 'flex-end' }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

        </View>

        {/* BOTÓN INICIAR SESIÓN */}
        <Pressable
          style={[
            styles.buttonWrapper,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient
            colors={['#AA0330', '#800427', '#260A13']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#E9DDD3" />
            ) : (
              <Text style={styles.buttonText}>iniciar sesión</Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* CONTINUAR CON GOOGLE (requiere development build) */}
        <GoogleButton onSuccess={onLoginSuccess} disabled={loading} />

        {/* REGISTRO */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿Aún no tienes una cuenta?
          </Text>

          <Pressable onPress={onRegister} disabled={loading}>
            <Text style={styles.link}>Crear cuenta</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

// ESTILOS
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#10060A',
  },

  glowContainer: {
    position: 'absolute',
    bottom: -330,
    left: '50%',
    marginLeft: -325,
    width: 650,
    height: 650,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 75,
    paddingBottom: 40,
  },

  backButton: {
    position: 'absolute',
    top: 65,
    left: 32,
    zIndex: 10,
    elevation: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(43, 17, 21, 0.90)',
    borderWidth: 1,
    borderColor: '#AA0330',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 150,
    height: 150,
    marginBottom: -5,
  },

  brand: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 48,
    color: '#E9DDD3',
    textAlign: 'center',
    marginBottom: 20,
  },

  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 39,
    color: '#E9DDD3',
    textAlign: 'center',
  },

  subtitle: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: '#C9B8B1',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },

  form: {
    width: '100%',
    gap: 10,
  },

  label: {
    fontFamily: 'PlayfairDisplay_400Regular',
    color: '#E9DDD3',
    fontSize: 13,
    marginTop: 8,
  },

  input: {
    backgroundColor: 'rgba(43, 17, 21, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(170, 3, 48, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#E9DDD3',
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
  },

  buttonWrapper: {
    width: '100%',
    marginTop: 30,
    borderRadius: 13,
    overflow: 'hidden',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  button: {
    paddingVertical: 15,
    alignItems: 'center',
  },

  buttonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 21,
    color: '#E9DDD3',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 25,
  },

  footerText: {
    color: '#C9B8B1',
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
  },

  link: {
    color: '#AA0330',
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    fontWeight: 'bold',
  },

});
