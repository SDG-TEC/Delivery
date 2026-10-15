import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Check, RefreshCw, Key, Globe, User, ShieldCheck } from 'lucide-react-native';
import {
  getStoredDriverName,
  setStoredDriverName,
  getStoredSupabaseConfig,
  setStoredSupabaseConfig,
  DEFAULT_CONFIG,
} from '../utils/storage';
import { testConnection, resetSupabaseClient } from '../config/supabase';

export const SettingsModal = ({ visible, onClose, onSaveSuccess }) => {
  const [driverName, setDriverName] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const name = await getStoredDriverName();
    const config = await getStoredSupabaseConfig();
    setDriverName(name);
    setSupabaseUrl(config.url || DEFAULT_CONFIG.SUPABASE_URL);
    setSupabaseKey(config.anonKey || DEFAULT_CONFIG.SUPABASE_KEY);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Temporarily set and test
      await setStoredSupabaseConfig(supabaseUrl, supabaseKey);
      resetSupabaseClient();
      const res = await testConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!driverName.trim()) {
      Alert.alert('Atenção', 'Informe o seu nome ou identificação de entregador.');
      return;
    }
    await setStoredDriverName(driverName.trim());
    await setStoredSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
    resetSupabaseClient();
    Alert.alert('Sucesso', 'Configurações salvas!');
    if (onSaveSuccess) onSaveSuccess();
    onClose();
  };

  const handleResetDefaults = () => {
    setSupabaseUrl(DEFAULT_CONFIG.SUPABASE_URL);
    setSupabaseKey(DEFAULT_CONFIG.SUPABASE_KEY);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configurações do App</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Driver Name Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={16} color="#f59e0b" />
                <Text style={styles.sectionTitle}>Identificação do Motoboy</Text>
              </View>
              <Text style={styles.inputHelp}>
                Este nome aparecerá para a cozinha no painel de pedidos e para o cliente no mapa.
              </Text>
              <TextInput
                style={styles.input}
                value={driverName}
                onChangeText={setDriverName}
                placeholder="Ex: Carlos - Moto 01"
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Supabase Connection Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Globe size={16} color="#38bdf8" />
                <Text style={styles.sectionTitle}>Conexão com o Servidor (Supabase)</Text>
              </View>
              <Text style={styles.inputHelp}>
                URL e Chave Pública do banco de dados do SDG Delivery.
              </Text>

              <Text style={styles.inputLabel}>URL do Supabase:</Text>
              <TextInput
                style={styles.input}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://seu-projeto.supabase.co"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>Anon Key (Chave Pública):</Text>
              <TextInput
                style={styles.input}
                value={supabaseKey}
                onChangeText={setSupabaseKey}
                placeholder="Chave pública do Supabase"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />

              <View style={styles.connectionActionsRow}>
                <TouchableOpacity
                  style={styles.testBtn}
                  onPress={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <RefreshCw size={14} color="#ffffff" />
                      <Text style={styles.testBtnText}>Testar Conexão</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetDefaults}
                >
                  <Text style={styles.resetBtnText}>Restaurar Padrão</Text>
                </TouchableOpacity>
              </View>

              {testResult && (
                <View
                  style={[
                    styles.testResultBox,
                    testResult.success ? styles.testSuccess : styles.testFail,
                  ]}
                >
                  <Text
                    style={[
                      styles.testResultText,
                      testResult.success ? styles.textSuccess : styles.textFail,
                    ]}
                  >
                    {testResult.message}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Save */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Check size={18} color="#020617" strokeWidth={2.5} />
              <Text style={styles.saveBtnText}>Salvar Configurações</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  inputHelp: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  connectionActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    flex: 1,
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  testResultBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  testSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSuccess: {
    color: '#34d399',
  },
  textFail: {
    color: '#f87171',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  saveBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '900',
  },
});
