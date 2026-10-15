import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { X, ShieldCheck, BatteryCharging, Zap, Smartphone } from 'lucide-react-native';
import * as Linking from 'expo-linking';

export const BatteryOptimizationGuideModal = ({ visible, onClose }) => {
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Zap size={20} color="#f59e0b" />
              <Text style={styles.modalTitle}>Rastrear com a Tela Apagada</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.introText}>
              Para que o rastreio continue transmitindo sua rota para a loja e o cliente enquanto o celular estiver com a tela apagada no bolso, ajuste 2 opções no Android:
            </Text>

            {/* Step 1 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Permissão de Localização</Text>
                <Text style={styles.stepDesc}>
                  Vá em Permissões &gt; Localização e selecione{' '}
                  <Text style={styles.highlight}>"Permitir o tempo todo"</Text> (em vez de "Apenas durante o uso").
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Economia de Bateria</Text>
                <Text style={styles.stepDesc}>
                  Vá em Bateria do aplicativo e selecione{' '}
                  <Text style={styles.highlight}>"Sem restrições"</Text> ou "Não otimizar". Isso impede que o Android suspenda o aplicativo no bolso.
                </Text>
              </View>
            </View>

            {/* Manufacturer Tips */}
            <View style={styles.brandBox}>
              <View style={styles.brandHeader}>
                <Smartphone size={16} color="#38bdf8" />
                <Text style={styles.brandTitle}>Dicas por Fabricante:</Text>
              </View>
              <Text style={styles.brandItem}>
                • <Text style={styles.bold}>Xiaomi / Redmi / Poco:</Text> Ative o "Início Automático" (Autostart) nas configurações do app e marque "Sem restrições" na economia de bateria.
              </Text>
              <Text style={styles.brandItem}>
                • <Text style={styles.bold}>Samsung:</Text> Bateria &gt; Limites de uso em segundo plano &gt; adicione o app em "Aplicativos nunca suspensos".
              </Text>
              <Text style={styles.brandItem}>
                • <Text style={styles.bold}>Motorola:</Text> Bateria &gt; Otimização de bateria &gt; Todos os apps &gt; marque "Não otimizar".
              </Text>
            </View>

            {/* Notification Bar Guarantee */}
            <View style={styles.notificationInfo}>
              <ShieldCheck size={16} color="#34d399" />
              <Text style={styles.notificationInfoText}>
                Enquanto o aplicativo estiver ONLINE, você verá uma notificação fixa na barra de status avisando que o GPS está transmitindo.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.openSettingsBtn} onPress={handleOpenSettings}>
              <Text style={styles.openSettingsText}>Abrir Configurações do App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  introText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '900',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  highlight: {
    color: '#34d399',
    fontWeight: '800',
  },
  brandBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginTop: 6,
    marginBottom: 12,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  brandTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  brandItem: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  bold: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 10,
  },
  notificationInfoText: {
    color: '#a7f3d0',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  openSettingsBtn: {
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  openSettingsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
