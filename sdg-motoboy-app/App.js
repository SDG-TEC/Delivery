import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Bike, Package, CheckCircle2, RefreshCw } from 'lucide-react-native';

import { Header } from './src/components/Header';
import { GpsStatusCard } from './src/components/GpsStatusCard';
import { EarningsSummary } from './src/components/EarningsSummary';
import { OrderCard } from './src/components/OrderCard';
import { SettingsModal } from './src/components/SettingsModal';
import { DriverProfileModal } from './src/components/DriverProfileModal';
import { BatteryOptimizationGuideModal } from './src/components/BatteryOptimizationGuideModal';

import {
  getStoredDriverName,
  getStoredOnlineStatus,
  setStoredOnlineStatus,
} from './src/utils/storage';
import {
  requestLocationPermissions,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isTrackingActive,
  addLocationListener,
} from './src/services/locationTask';
import {
  fetchDeliveryOrders,
  subscribeToOrdersRealtime,
  updateOrderStatus,
  fetchStoreSettings,
} from './src/services/orderService';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'available' | 'completed'
  const [driverName, setDriverName] = useState('Entregador 1');
  const [isOnline, setIsOnline] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [batteryGuideVisible, setBatteryGuideVisible] = useState(false);

  // Carrega dados iniciais
  const loadInitialData = useCallback(async () => {
    try {
      const storedName = await getStoredDriverName();
      setDriverName(storedName);

      const storedOnline = await getStoredOnlineStatus();
      setIsOnline(storedOnline);

      const settings = await fetchStoreSettings();
      if (settings) setStoreSettings(settings);

      await refreshOrders();
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    }
  }, []);

  const refreshOrders = async () => {
    const res = await fetchDeliveryOrders();
    if (res.data) {
      setOrders(res.data);
    }
  };

  const onPullToRefresh = async () => {
    setRefreshing(true);
    await refreshOrders();
    const tracking = await isTrackingActive();
    setIsTracking(tracking);
    setRefreshing(false);
  };

  // Inicializa rastreamento GPS
  const setupTracking = useCallback(async (shouldTrack) => {
    if (shouldTrack) {
      const perm = await requestLocationPermissions();
      if (!perm.granted) {
        Alert.alert(
          'Permissão Necessária',
          perm.reason || 'Conceda a permissão de localização "Permitir o tempo todo" para rastreio com a tela apagada.',
          [
            { text: 'Ajustar Bateria/Permissões', onPress: () => setBatteryGuideVisible(true) },
            { text: 'Entendi' },
          ]
        );
        setIsTracking(false);
        return;
      }

      try {
        await startBackgroundLocationTracking();
        setIsTracking(true);
      } catch (err) {
        console.error('Erro ao iniciar rastreamento:', err);
        setIsTracking(false);
      }
    } else {
      await stopBackgroundLocationTracking();
      setIsTracking(false);
    }
  }, []);

  // Alterna status Online / Offline
  const handleToggleOnline = async (newVal) => {
    setIsOnline(newVal);
    await setStoredOnlineStatus(newVal);
    await setupTracking(newVal);
  };

  // Montagem inicial e listeners
  useEffect(() => {
    loadInitialData();

    // Listener de coordenadas para a UI
    const unsubscribeLocation = addLocationListener((coords) => {
      setCurrentCoords(coords);
      setIsTracking(true);
    });

    // Assina atualizações em tempo real no Supabase
    let unsubscribeOrders = null;
    subscribeToOrdersRealtime(() => {
      refreshOrders();
    }).then((unsub) => {
      unsubscribeOrders = unsub;
    });

    // Inicia rastreamento de forma suave após a renderização inicial
    const initTimer = setTimeout(() => {
      getStoredOnlineStatus().then((online) => {
        if (online) {
          setupTracking(true).catch(console.warn);
        }
      });
    }, 1200);

    return () => {
      clearTimeout(initTimer);
      if (unsubscribeLocation) unsubscribeLocation();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [loadInitialData, setupTracking]);

  // Ações de pedido
  const handleStartDelivery = async (orderId) => {
    const res = await updateOrderStatus(orderId, 'saiu_para_entrega', driverName);
    if (res.success) {
      setActiveTab('active');
      await refreshOrders();
      Alert.alert('Entrega Iniciada! 🛵', 'Rota atualizada no mapa para a cozinha e o cliente.');
    } else {
      Alert.alert('Erro', res.error || 'Não foi possível iniciar a entrega.');
    }
  };

  const handleCompleteDelivery = (order) => {
    Alert.alert(
      'Confirmar Entrega',
      `Deseja marcar o pedido #${order.id} como entregue ao cliente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Entrega',
          style: 'default',
          onPress: async () => {
            const res = await updateOrderStatus(order.id, 'entregue', driverName);
            if (res.success) {
              await refreshOrders();
              Alert.alert('Sucesso! 🎉', 'Pedido entregue com sucesso.');
            } else {
              Alert.alert('Erro', res.error || 'Falha ao concluir entrega.');
            }
          },
        },
      ]
    );
  };

  // Separação dos pedidos por status
  const availableOrders = orders.filter((o) => o.status === 'pronto');
  const inRouteOrders = orders.filter((o) => o.status === 'saiu_para_entrega');
  const completedOrders = orders.filter((o) => o.status === 'entregue');

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'active':
        return inRouteOrders;
      case 'available':
        return availableOrders;
      case 'completed':
        return completedOrders;
      default:
        return inRouteOrders;
    }
  };

  const currentList = getFilteredOrders();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header Superior */}
      <Header
        storeName={storeSettings?.name || 'SDG Delivery'}
        driverName={driverName}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onPressSettings={() => setSettingsVisible(true)}
        onPressProfile={() => setProfileVisible(true)}
      />

      {/* Cartão de Status do GPS em Segundo Plano */}
      <GpsStatusCard
        isOnline={isOnline}
        isTracking={isTracking}
        currentCoords={currentCoords}
        onPressBatteryGuide={() => setBatteryGuideVisible(true)}
      />

      {/* Resumo de Ganhos e Acerto do Caixa */}
      <EarningsSummary
        completedOrders={completedOrders}
        deliveryFee={storeSettings?.deliveryFee || 5}
      />

      {/* Navegação por Abas (Tabs) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Bike size={16} color={activeTab === 'active' ? '#f59e0b' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Em Rota
          </Text>
          {inRouteOrders.length > 0 && (
            <View style={styles.badgeCountAmber}>
              <Text style={styles.badgeCountTextAmber}>{inRouteOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'available' && styles.tabButtonActive]}
          onPress={() => setActiveTab('available')}
          activeOpacity={0.7}
        >
          <Package size={16} color={activeTab === 'available' ? '#38bdf8' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
            Prontos
          </Text>
          {availableOrders.length > 0 && (
            <View style={styles.badgeCountBlue}>
              <Text style={styles.badgeCountTextBlue}>{availableOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <CheckCircle2 size={16} color={activeTab === 'completed' ? '#34d399' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Entregues
          </Text>
          {completedOrders.length > 0 && (
            <View style={styles.badgeCountGreen}>
              <Text style={styles.badgeCountTextGreen}>{completedOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista de Pedidos */}
      <FlatList
        data={currentList}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onStartDelivery={handleStartDelivery}
            onCompleteDelivery={handleCompleteDelivery}
            storeName={storeSettings?.name}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullToRefresh}
            tintColor="#f59e0b"
            colors={['#f59e0b']}
          />
        }
        contentContainerStyle={currentList.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <RefreshCw size={28} color="#475569" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'active'
                ? 'Nenhuma entrega em rota'
                : activeTab === 'available'
                ? 'Nenhum pedido aguardando coleta'
                : 'Nenhum pedido entregue ainda hoje'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active'
                ? 'Veja a aba "Prontos" para iniciar novas entregas da cozinha.'
                : 'Puxe para baixo para atualizar a lista.'}
            </Text>
          </View>
        }
      />

      {/* Modais */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSaveSuccess={() => {
          loadInitialData();
          setupTracking(isOnline);
        }}
      />

      <DriverProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
        onNameSaved={(name) => setDriverName(name)}
      />

      <BatteryOptimizationGuideModal
        visible={batteryGuideVisible}
        onClose={() => setBatteryGuideVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#f8fafc',
  },
  badgeCountAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  badgeCountTextAmber: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
  },
  badgeCountBlue: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  badgeCountTextBlue: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '900',
  },
  badgeCountGreen: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeCountTextGreen: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '900',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
