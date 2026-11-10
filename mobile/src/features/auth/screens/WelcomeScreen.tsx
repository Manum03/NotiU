
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
  Pressable,
  Modal,
} from 'react-native';

type Props = {
  onLogin: () => void;
  onRegister: () => void;
};

export default function WelcomeScreen({ onLogin, onRegister }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Mostrar mensaje personalizado
  const showNotice = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  // Mensajes de redes sociales
  const handleSocialLogin = (provider: string) => {
    showNotice(
      '¡Muy pronto!',
      `Estamos preparando esta opción para que puedas continuar con ${provider}.`
    );
  };

  return (
    <View style={styles.container}>

      {/* RESPLANDOR CIRCULAR */}
      <View style={styles.glowContainer}>
        <Svg width={700} height={700} viewBox="0 0 700 700">
          <Defs>
            <RadialGradient
              id="backgroundGlow"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <Stop offset="0%" stopColor="#AA0330" stopOpacity="0.85" />
              <Stop offset="35%" stopColor="#800427" stopOpacity="0.55" />
              <Stop offset="70%" stopColor="#4E021A" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#10060A" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle
            cx="350"
            cy="350"
            r="350"
            fill="url(#backgroundGlow)"
          />
        </Svg>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <View style={styles.content}>

        {/* Logo */}
        <Image
          source={require('../../../assets/images/logonotiU.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Nombre NOTIU */}
        <Text style={styles.appName}>
          Noti<Text style={styles.appNameU}>U</Text>
        </Text>

        <Text style={styles.title}>
          ¡Bienvenido a NOTIU!
        </Text>

        <Text style={styles.description}>
          Organiza tus tareas, recuerda tus fechas importantes y mantén tus
          objetivos siempre en mente.
        </Text>

        {/* BOTONES */}
        <View style={styles.buttons}>

          {/* Iniciar sesión */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={onLogin}
          >
            <LinearGradient
              colors={['#AA0330', '#800427', '#260A13']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.loginButton}
            >
              <Text style={styles.buttonText}>
                iniciar sesión
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Crear cuenta */}
          <Pressable
            style={styles.buttonWrapper}
            onPress={onRegister}
          >
            <LinearGradient
              colors={['#AA0330', '#800427', '#260A13']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.outlineGradient}
            >
              <View style={styles.outlineInner}>
                <Text style={styles.buttonText}>
                  crear cuenta
                </Text>
              </View>
            </LinearGradient>
          </Pressable>

        </View>

        {/* SEPARADOR */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.orText}>o</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* ICONOS SOCIALES */}
        <View style={styles.socialContainer}>

          <Pressable
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Google')}
          >
            <Text style={styles.googleIcon}>G</Text>
          </Pressable>

          <Pressable
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Facebook')}
          >
            <Text style={styles.facebookIcon}>f</Text>
          </Pressable>

          <Pressable
            style={styles.socialButton}
            onPress={() => handleSocialLogin('correo electrónico')}
          >
            <Lucide name="mail" size={25} color="#E9DDD3" />
          </Pressable>

        </View>
      </View>

      {/* VENTANA EMERGENTE PERSONALIZADA */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>

          <LinearGradient
            colors={['#AA0330', '#800427', '#260A13']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalBorder}
          >
            <View style={styles.modalCard}>

              <View style={styles.modalIconContainer}>
                {/* Aquí irá la ilustración de NOTIU */}
                <View style={styles.illustrationPlaceholder} />
              </View>

              <Text style={styles.modalEyebrow}>
                NOTIU
              </Text>

              <Text style={styles.modalTitle}>
                {modalTitle}
              </Text>

              <View style={styles.modalDivider} />

              <Text style={styles.modalMessage}>
                {modalMessage}
              </Text>

              <Pressable
                style={styles.modalButtonWrapper}
                onPress={() => setModalVisible(false)}
              >
                <LinearGradient
                  colors={['#AA0330', '#800427', '#260A13']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>
                    entendido
                  </Text>
                </LinearGradient>
              </Pressable>

            </View>
          </LinearGradient>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#10060A',
  },

  // RESPLANDOR
  glowContainer: {
    position: 'absolute',
    bottom: -350,
    left: '50%',
    marginLeft: -350,
    width: 700,
    height: 700,
  },

  // CONTENIDO
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 52,
  },

  logo: {
    width: 180,
    height: 180,
    marginBottom: 2,
  },

  appName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 75,
    color: '#E9DDD3',
    marginBottom: 14,
  },

  appNameU: {
    color: '#AA0330',
  },

  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 35,
    color: '#E9DDD3',
    textAlign: 'center',
    marginBottom: 15,
  },

  description: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    color: '#E9DDD3',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 35,
  },

  // BOTONES PRINCIPALES
  buttons: {
    width: '100%',
    gap: 15,
  },

  buttonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },

  loginButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  outlineGradient: {
    padding: 3,
    borderRadius: 14,
  },

  outlineInner: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#10060A',
  },

  buttonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 21,
    color: '#E9DDD3',
  },

  // SEPARADOR
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '110%',
    marginTop: 40,
    marginBottom: 52,
    gap: 25,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FF0044',
    opacity: 0.8,
  },

  orText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    color: '#AA0330',
    fontSize: 16,
  },

  // ICONOS SOCIALES
  socialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 45,
  },

  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#260A132F',
    borderWidth: 1,
    borderColor: '#AA033085',
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E9DDD3',
  },

  facebookIcon: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#E9DDD3',
  },

  // VENTANA EMERGENTE
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  modalBorder: {
    width: '100%',
    padding: 1.5,
    borderRadius: 23,
  },

  modalCard: {
    backgroundColor: '#16080E',
    borderRadius: 22,
    paddingHorizontal: 25,
    paddingVertical: 30,
    alignItems: 'center',
  },

  modalIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2B1115',
    borderWidth: 1,
    borderColor: '#AA0330',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  illustrationPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#AA0330',
    opacity: 0.55,
  },

  modalEyebrow: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 14,
    letterSpacing: 2,
    color: '#AA0330',
    marginBottom: 9,
  },

  modalTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 29,
    color: '#E9DDD3',
    textAlign: 'center',
  },

  modalDivider: {
    width: 55,
    height: 2,
    backgroundColor: '#AA0330',
    borderRadius: 5,
    marginVertical: 17,
  },

  modalMessage: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    lineHeight: 24,
    color: '#C9B8B1',
    textAlign: 'center',
  },

  modalButtonWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 25,
  },

  modalButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 19,
    color: '#E9DDD3',
  },

});
