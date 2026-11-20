// Botón "Continuar con Google" con el estilo de las pantallas de autenticación.
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useGoogleLogin } from '../hooks/useGoogleLogin';

type Props = {
  onSuccess: () => void;
  disabled?: boolean;
};

export default function GoogleButton({ onSuccess, disabled = false }: Props) {
  const { loading, signIn } = useGoogleLogin(onSuccess);

  return (
    <Pressable
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={signIn}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
    >
      {loading ? (
        <ActivityIndicator color="#E9DDD3" />
      ) : (
        <>
          <Text style={styles.icon}>G</Text>
          <Text style={styles.text}>continuar con google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#AA033085',
    backgroundColor: '#260A132F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E9DDD3',
  },
  text: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: '#E9DDD3',
  },
});
