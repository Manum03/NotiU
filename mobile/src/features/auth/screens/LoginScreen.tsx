
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

// Servicios para conectar con el backend y guardar la sesión.
import { apiRequest } from '../../../services/api/api';
import { saveSession, AuthSession } from '../../../services/storage/authStorage';

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

  // Estados de los campos del formulario.
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Estado para evitar varios intentos simultáneos.
  const [loading, setLoading] = useState(false);

  // Controla el inicio de sesión.
  const handleLogin = async () => {

    // Validar que todos los campos estén completos.
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Por favor, completa todos los campos.'
      );
      return;
    }

    try {
      setLoading(true);

      // Enviar las credenciales al backend.
      // IMPORTANTE: este ejemplo supone que el endpoint es POST /auth/login
      // y que recibe username, email y password.
      const response = await apiRequest<AuthSession>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      // Comprobar que el backend haya devuelto una sesión válida.
      if (!response?.token || !response?.expiresAt || !response?.user) {
        throw new Error('El servidor no devolvió una sesión válida.');
      }

      // Guardar el token y los datos del usuario.
      await saveSession(response);

      // Continuar hacia el Home únicamente después de guardar la sesión.
      onLoginSuccess();

    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);

      Alert.alert(
        'No se pudo iniciar sesión',
        error?.message || 'Ocurrió un problema al conectar con el servidor.'
      );

    } finally {
      setLoading(false);
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

          <Text style={styles.label}>Usuario</Text>
          <TextInput
            placeholder="Escribe tu nombre de usuario"
            placeholderTextColor="#9C777D"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />

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
