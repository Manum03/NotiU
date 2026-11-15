import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'notiu_user';

export type StoredUser = {
  username: string;
  email: string;
  password: string;
};

export async function saveUser(user: StoredUser) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({ ...user, email: user.email.trim().toLowerCase() })
  );
}

export async function validateLogin(
  username: string,
  email: string,
  password: string
): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return false;

  const user: StoredUser = JSON.parse(raw);
  return (
    user.username === username.trim() &&
    user.email === email.trim().toLowerCase() &&
    user.password === password
  );
}