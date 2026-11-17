import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Lucide } from '@react-native-vector-icons/lucide';

const COLORS = {
  wine: '#800427',
  brightWine: '#AA0330',
  text: '#E9DDD3',
};

export default function HeaderActions() {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() =>
          Alert.alert(
            'Notificaciones',
            'Próximamente podrás consultar tus notificaciones.'
          )
        }
      >
        <Lucide name="bell" size={35} color={COLORS.brightWine} />
      </Pressable>

      <Pressable
        style={styles.avatar}
        onPress={() =>
          Alert.alert('Perfil', 'Aquí podrás consultar tu perfil.')
        }
      >
        <Lucide name="user-round" size={20} color={COLORS.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
container: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 18,
  marginTop: -70,
  marginLeft: 10,
},

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});