import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getSupabaseClient } from '../config/supabase';
import {
  getStoredDriverName,
  getStoredOnlineStatus,
  getStoredActiveOrderId,
} from '../utils/storage';

export const BACKGROUND_LOCATION_TASK = 'sdg-motoboy-background-location';

// Detecta se está rodando no cliente Expo Go ou APK instalado
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let expoGoWatchSubscription = null;
const locationListeners = new Set();

export const addLocationListener = (listener) => {
  locationListeners.add(listener);
  return () => locationListeners.delete(listener);
};

const notifyLocationListeners = (coords) => {
  locationListeners.forEach((listener) => {
    try {
      listener(coords);
    } catch (e) {
      console.warn('Erro ao notificar listener de GPS:', e);
    }
  });
};

let mobileBroadcastChannel = null;
const getMobileBroadcastChannel = (supabase) => {
  if (!mobileBroadcastChannel) {
    mobileBroadcastChannel = supabase.channel('sdg-motoboy-broadcast');
    mobileBroadcastChannel.subscribe();
  }
  return mobileBroadcastChannel;
};

/**
 * Transmite a localização para o Supabase (Banco de dados e Canal Realtime)
 */
export const transmitLocation = async (coords) => {
  try {
    if (!coords || coords.latitude === undefined || coords.longitude === undefined) return;

    const isOnline = await getStoredOnlineStatus();
    if (!isOnline) return;

    const driverName = await getStoredDriverName();
    const activeOrderId = await getStoredActiveOrderId();

    const speedKmH = coords.speed && coords.speed > 0 ? Math.round(coords.speed * 3.6) : 0;
    const cleanCoords = {
      id: driverName,
      driverName,
      orderId: activeOrderId || '',
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: speedKmH,
      heading: coords.heading || 0,
      accuracy: Math.round(coords.accuracy || 0),
      isOnline: true,
      updatedAt: new Date().toISOString(),
    };

    // Notifica UI local
    notifyLocationListeners(cleanCoords);

    const supabase = await getSupabaseClient();
    if (!supabase) return;

    // 1. Broadcast instantâneo no WebSocket Realtime
    try {
      const channel = getMobileBroadcastChannel(supabase);
      channel.send({
        type: 'broadcast',
        event: 'location_update',
        payload: cleanCoords,
      });
    } catch (broadcastErr) {
      console.warn('Falha no broadcast realtime:', broadcastErr);
    }

    // 2. Persistência na tabela motoboy_locations
    try {
      await supabase.from('motoboy_locations').upsert(
        {
          id: driverName,
          driver_name: driverName,
          order_id: activeOrderId || '',
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: speedKmH,
          heading: coords.heading || 0,
          accuracy: Math.round(coords.accuracy || 0),
          is_online: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (dbErr) {
      console.warn('Falha ao gravar motoboy_locations:', dbErr);
    }

    // 3. Atualiza pedido ativo em rota
    if (activeOrderId) {
      try {
        await supabase
          .from('orders')
          .update({
            delivery_gps: {
              latitude: coords.latitude,
              longitude: coords.longitude,
              speed: speedKmH,
              heading: coords.heading || 0,
              accuracy: Math.round(coords.accuracy || 0),
              driverName,
              updatedAt: new Date().toISOString(),
            },
          })
          .eq('id', activeOrderId);
      } catch (orderGpsErr) {
        console.warn('Falha ao sincronizar GPS no pedido:', orderGpsErr);
      }
    }
  } catch (err) {
    console.error('Erro geral ao transmitir localização:', err);
  }
};

/**
 * Registra a tarefa nativa em segundo plano no TaskManager
 */
try {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('Aviso TaskManager:', error.message);
      return;
    }
    if (data && data.locations && data.locations.length > 0) {
      const latestLocation = data.locations[data.locations.length - 1];
      if (latestLocation && latestLocation.coords) {
        await transmitLocation(latestLocation.coords);
      }
    }
  });
} catch (taskErr) {
  console.warn('TaskManager setup handled:', taskErr);
}

/**
 * Solicita as permissões necessárias (Notificações + GPS em 1º plano + GPS em 2º plano)
 */
export const requestLocationPermissions = async () => {
  try {
    // 1. Permissão de Notificações (Obrigatória no Android 13+ para não fechar o app)
    try {
      await Notifications.requestPermissionsAsync();
    } catch (notifErr) {
      console.warn('Permissão de notificações ignorada:', notifErr);
    }

    // 2. Permissão de Localização em primeiro plano
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      return {
        granted: false,
        reason: 'Permissão de GPS negada. Ative a localização para usar o aplicativo.',
      };
    }

    // Se estiver no Expo Go, não solicita permissão de background para evitar conflito
    if (isExpoGo) {
      return { granted: true, isExpoGo: true };
    }

    // 3. Permissão em segundo plano ("Permitir o tempo todo") para o APK nativo
    try {
      const background = await Location.requestBackgroundPermissionsAsync();
      if (background.status !== 'granted') {
        return {
          granted: true, // Não bloqueia o app, continua em modo foreground
          reason: 'Para rastreamento com a tela apagada no bolso, escolha "Permitir o tempo todo" nas configurações.',
        };
      }
    } catch (bgErr) {
      console.warn('Permissão em segundo plano:', bgErr);
    }

    return { granted: true, isExpoGo: false };
  } catch (err) {
    console.error('Erro ao solicitar permissões:', err);
    return { granted: false, reason: err.message };
  }
};

/**
 * Inicia o rastreamento GPS
 */
export const startBackgroundLocationTracking = async () => {
  try {
    // No Expo Go: usa watchPositionAsync seguro
    if (isExpoGo) {
      if (expoGoWatchSubscription) {
        try {
          expoGoWatchSubscription.remove();
        } catch (e) {}
      }

      expoGoWatchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 3,
        },
        (loc) => {
          if (loc && loc.coords) transmitLocation(loc.coords);
        }
      );

      // Leitura imediata
      try {
        const curr = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (curr?.coords) transmitLocation(curr.coords);
      } catch (e) {}
      return;
    }

    // No APK Standalone instalado:
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
      if (!isRegistered) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
        }
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 4000,
        distanceInterval: 4,
        deferredUpdatesInterval: 4000,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        foregroundService: {
          notificationTitle: 'SDG Entregador 🛵',
          notificationBody: 'Rastreando rota em tempo real',
          notificationColor: '#f59e0b',
        },
      });

      // Leitura imediata
      try {
        const curr = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (curr?.coords) transmitLocation(curr.coords);
      } catch (e) {}
    } catch (nativeErr) {
      console.warn('Foreground Service nativo falhou, ativando fallback:', nativeErr);
      // Fallback seguro se o Android recusar o Foreground Service
      if (expoGoWatchSubscription) expoGoWatchSubscription.remove();
      expoGoWatchSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 4000, distanceInterval: 4 },
        (loc) => loc?.coords && transmitLocation(loc.coords)
      );
    }
  } catch (err) {
    console.error('Erro ao iniciar rastreamento:', err);
  }
};

/**
 * Para o rastreamento GPS
 */
export const stopBackgroundLocationTracking = async () => {
  try {
    if (expoGoWatchSubscription) {
      try {
        expoGoWatchSubscription.remove();
      } catch (e) {}
      expoGoWatchSubscription = null;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => {});
    }

    const driverName = await getStoredDriverName();
    const supabase = await getSupabaseClient();
    if (supabase) {
      await supabase
        .from('motoboy_locations')
        .update({ is_online: false, updated_at: new Date().toISOString() })
        .eq('id', driverName)
        .catch(() => {});
    }
  } catch (err) {
    console.warn('Erro ao parar rastreamento:', err);
  }
};

/**
 * Verifica se o rastreamento está ativo
 */
export const isTrackingActive = async () => {
  try {
    if (isExpoGo || expoGoWatchSubscription) {
      return Boolean(expoGoWatchSubscription);
    }
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return Boolean(expoGoWatchSubscription);
  }
};
