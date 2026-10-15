import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export const openGoogleMaps = async (address) => {
  if (!address) {
    Alert.alert('Aviso', 'Endereço de entrega não especificado.');
    return;
  }
  const encoded = encodeURIComponent(address);
  const nativeUrl = `google.navigation:q=${encoded}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    await Linking.openURL(webUrl);
  }
};

export const openWaze = async (address) => {
  if (!address) {
    Alert.alert('Aviso', 'Endereço de entrega não especificado.');
    return;
  }
  const encoded = encodeURIComponent(address);
  const nativeUrl = `waze://?q=${encoded}&navigate=yes`;
  const webUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    await Linking.openURL(webUrl);
  }
};

export const openWhatsApp = async (phone, message = '') => {
  if (!phone) {
    Alert.alert('Aviso', 'Telefone do cliente não encontrado.');
    return;
  }

  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedMsg = encodeURIComponent(message);
  const nativeUrl = `whatsapp://send?phone=${phoneWithCountry}&text=${encodedMsg}`;
  const webUrl = `https://wa.me/${phoneWithCountry}?text=${encodedMsg}`;

  try {
    const supported = await Linking.canOpenURL(nativeUrl);
    if (supported) {
      await Linking.openURL(nativeUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (err) {
    await Linking.openURL(webUrl);
  }
};

export const callPhone = async (phone) => {
  if (!phone) {
    Alert.alert('Aviso', 'Telefone não disponível.');
    return;
  }
  const clean = phone.replace(/\D/g, '');
  const url = `tel:${clean}`;
  try {
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('Erro', 'Não foi possível discar para o número.');
  }
};
