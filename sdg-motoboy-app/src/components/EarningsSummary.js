import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, DollarSign, Wallet } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatters';

export const EarningsSummary = ({ completedOrders = [], deliveryFee = 5 }) => {
  const completedCount = completedOrders.length;
  const estimatedFees = completedOrders.reduce((sum, o) => {
    const fee = o.deliveryFee !== undefined && o.deliveryFee !== null ? Number(o.deliveryFee) : (Number(deliveryFee) || 5);
    return sum + fee;
  }, 0);

  const cashToReconcile = completedOrders
    .filter((o) => o.paymentMethod === 'cash' || o.paymentMethod === 'money')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircleBlue}>
          <CheckCircle2 size={16} color="#38bdf8" />
        </View>
        <Text style={styles.label}>ENTREGAS HOJE</Text>
        <Text style={styles.valueBlue}>{completedCount}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconCircleGreen}>
          <DollarSign size={16} color="#34d399" />
        </View>
        <Text style={styles.label}>ESTIMATIVA TAXAS</Text>
        <Text style={styles.valueGreen}>{formatCurrency(estimatedFees)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconCircleAmber}>
          <Wallet size={16} color="#fbbf24" />
        </View>
        <Text style={styles.label}>ACERTO DINHEIRO</Text>
        <Text style={styles.valueAmber}>{formatCurrency(cashToReconcile)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  iconCircleBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircleGreen: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircleAmber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  valueBlue: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  valueGreen: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  valueAmber: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});
