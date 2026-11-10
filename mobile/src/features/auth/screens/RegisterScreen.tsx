
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
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';

type Props = {
  onBack: () => void;
  onLogin: () => void;
};

export default function RegisterScreen({ onBack, onLogin }: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

      {/* RESPLANDOR CIRCULAR */}
      <View style={styles.glow} pointerEvents="none">
        <Svg width={650} height={650} viewBox="0 0 650 650">
          <Defs>
            <RadialGradient id="registerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#AA0330" stopOpacity="0.8" />
              <Stop offset="35%" stopColor="#800427" stopOpacity="0.5" />
              <Stop offset="70%" stopColor="#4E021A" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#10060A" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle cx="325" cy="325" r="325" fill="url(#registerGlow)" />
        </Svg>
      </View>

      {/* BOTÓN VOLVER FIJO */}
      <Pressable style={styles.backButton} onPress={onBack}>
        <Lucide name="arrow-left" size={21} color="#E9DDD3" />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* LOGO */}
        <Image
          source={require('../../../assets/images/logonotiU.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* NOMBRE */}
        <Text style={styles.appName}>
          Noti<Text style={styles.appNameU}>U</Text>
        </Text>

        {/* ENCABEZADO */}
        <View style={styles.header}>
          <Text style={styles.title}>crear cuenta</Text>

          <Text style={styles.subtitle}>
            Completa tus datos para comenzar.
          </Text>
        </View>

        {/* FORMULARIO */}
        <View style={styles.form}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu nombre"
              placeholderTextColor="#9C484F"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="Ejemplo@correo.com"
              placeholderTextColor="#9C484F"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#9C484F"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Repite tu contraseña"
              placeholderTextColor="#9C484F"
              secureTextEntry
            />
          </View>

        </View>

        {/* BOTÓN CREAR CUENTA */}
        <Pressable
          style={styles.buttonWrapper}
          onPress={() => setModalVisible(true)}
        >
          <LinearGradient
            colors={['#AA0330', '#800427', '#260A13']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>crear mi cuenta</Text>
          </LinearGradient>
        </Pressable>

        {/* IR A INICIAR SESIÓN */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿Ya tienes una cuenta?
          </Text>

          <Pressable onPress={onLogin}>
            <Text style={styles.loginLink}>Inicia sesión</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* VENTANA DE CONFIRMACIÓN */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
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

              <View style={styles.modalIcon}>
                <Lucide name="check" size={29} color="#E9DDD3" />
              </View>

              <Text style={styles.modalEyebrow}>NOTIU</Text>

              <Text style={styles.modalTitle}>
                ¡Ya casi formas parte de NOTIU!
              </Text>

              <View style={styles.modalDivider} />

              <Text style={styles.modalMessage}>
                Tu pantalla de registro está lista. Cuando conectemos
                el sistema de cuentas, podrás crear tu perfil y comenzar
                a organizar tus tareas.
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
                  <Text style={styles.modalButtonText}>entendido</Text>
                </LinearGradient>
              </Pressable>

            </View>
          </LinearGradient>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#10060A',
  },

  glow: {
    position: 'absolute',
    bottom: -330,
    left: '50%',
    marginLeft: -325,
    width: 650,
    height: 650,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 75,
    paddingBottom: 35,
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
  },

  appName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 48,
    color: '#E9DDD3',
    marginTop: -5,
  },

  appNameU: {
    color: '#AA0330',
  },

  header: {
    width: '100%',
    marginTop: 12,
    marginBottom: 24,
  },

  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 29,
    color: '#E9DDD3',
  },

  subtitle: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: '#9C7779',
    marginTop: 2,
  },

  form: {
    width: '100%',
    gap: 15,
  },

  inputGroup: {
    width: '100%',
  },

  label: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
    color: '#E9DDD3',
    marginBottom: 7,
  },

  input: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2B1115',
    borderWidth: 1,
    borderColor: '#800427',
    paddingHorizontal: 16,
    color: '#E9DDD3',
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 12,
  },

  buttonWrapper: {
    width: '85%',
    borderRadius: 13,
    overflow: 'hidden',
    marginTop: 28,
  },

  button: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: '#E9DDD3',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
    gap: 6,
  },

  footerText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 11,
    color: '#C9B8B1',
  },

  loginLink: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 15,
    color: '#AA0330',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
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

  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2B1115',
    borderWidth: 1,
    borderColor: '#AA0330',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    fontSize: 27,
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
    fontSize: 13,
    lineHeight: 23,
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
