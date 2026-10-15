import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Navigation, ShieldCheck, AlertCircle, Zap, Smartphone } from 'lucide-react-native';
import { isExpoGo } from '../services/locationTask';

export const GpsStatusCard = ({
  isOnline,
  isTracking,
  currentCoords,
  onPressBatteryGuide,
}) => {
  if (!isOnline) {
    return (
      <View style={[styles.card, styles.cardOffline]}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircleOffline}>
            <AlertCircle size={18} color="#f87171" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.titleOffline}>Rastreamento em Pausa</Text>
            <Text style={styles.subtitleOffline}>
              Ative o botão ONLINE para voltar a transmitir sua rota
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, isTracking ? styles.cardActive : styles.cardWarning]}>
      <View style={styles.headerRow}>
        <View style={isTracking ? styles.iconCircleActive : styles.iconCircleWarning}>
          <Navigation size={18} color={isTracking ? '#10b981' : '#f59e0b'} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.statusLine}>
            <Text style={styles.title}>
              {isTracking
                ? isExpoGo
                  ? 'GPS Ao Vivo (Prévia Expo Go)'
                  : 'GPS Ativo em Segundo Plano'
                : 'Aguardando Sinal de GPS...'}
            </Text>
            {isTracking && (
              <View style={styles.activePill}>
                <ShieldCheck size={12} color="#10b981" />
                <Text style={styles.activePillText}>
                  {isExpoGo ? 'TESTE AO VIVO' : 'TELA APAGADA OK'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {isTracking
              ? 'Localização transmitida ao vivo para a cozinha e o cliente.'
              : 'Verifique se a localização está ativada nas configurações do Android.'}
          </Text>
        </View>
      </View>

      {currentCoords && (
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>VELOCIDADE</Text>
            <Text style={styles.metricValue}>
              {currentCoords.speed ? `${currentCoords.speed} km/h` : '0 km/h'}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PRECISÃO</Text>
            <Text style={styles.metricValue}>
              {currentCoords.accuracy ? `±${currentCoords.accuracy}m` : '--'}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ÚLTIMA ATUALIZAÇÃO</Text>
            <Text style={styles.metricValue}>
              {currentCoords.updatedAt
                ? new Date(currentCoords.updatedAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Agora'}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.batteryGuideButton}
        onPress={onPressBatteryGuide}
        activeOpacity={0.7}
      >
        <Zap size={14} color="#f59e0b" />
        <Text style={styles.batteryGuideText}>
          Dica: Configurar bateria para não desligar o rastreio no bolso
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  cardActive: {
    backgroundColor: '#09251e',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cardWarning: {
    backgroundColor: '#261b0c',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cardOffline: {
    backgroundColor: '#1f1315',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleWarning: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleOffline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  titleOffline: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  subtitleOffline: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activePillText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  batteryGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  batteryGuideText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
