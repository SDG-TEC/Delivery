import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  MapPin,
  Phone,
  MessageSquare,
  Navigation,
  CheckCircle,
  Bike,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react-native';
import {
  formatCurrency,
  formatTime,
  formatPaymentMethod,
} from '../utils/formatters';
import {
  openGoogleMaps,
  openWaze,
  openWhatsApp,
  callPhone,
} from '../utils/navigation';

export const OrderCard = ({
  order,
  onStartDelivery,
  onCompleteDelivery,
  storeName,
}) => {
  const [expanded, setExpanded] = useState(order.status === 'saiu_para_entrega');

  const isAvailable = order.status === 'pronto';
  const isInRoute = order.status === 'saiu_para_entrega';
  const isDelivered = order.status === 'entregue';

  const handleWhatsApp = () => {
    const msg = `Olá, *${order.customerName}*! Sou o entregador do *${storeName || 'SDG Delivery'}* e já estou com o seu pedido *#${order.id}*. Pode vir receber? 🛵`;
    openWhatsApp(order.customerPhone, msg);
  };

  return (
    <View
      style={[
        styles.card,
        isInRoute && styles.cardInRoute,
        isAvailable && styles.cardAvailable,
      ]}
    >
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.orderIdBadge}>
          <Text style={styles.orderIdText}>#{order.id}</Text>
        </View>

        <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>

        <View style={styles.statusContainer}>
          {isAvailable && (
            <View style={styles.statusAvailableBadge}>
              <Text style={styles.statusAvailableText}>PRONTO PARA COLETAR</Text>
            </View>
          )}
          {isInRoute && (
            <View style={styles.statusInRouteBadge}>
              <Text style={styles.statusInRouteText}>EM ROTA COM VOCÊ</Text>
            </View>
          )}
          {isDelivered && (
            <View style={styles.statusDeliveredBadge}>
              <Text style={styles.statusDeliveredText}>ENTREGUE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Customer Info & Address */}
      <View style={styles.body}>
        <Text style={styles.customerName}>{order.customerName}</Text>

        <TouchableOpacity
          style={styles.addressContainer}
          onPress={() => openGoogleMaps(order.address)}
          activeOpacity={0.7}
        >
          <MapPin size={18} color="#f59e0b" style={styles.addressIcon} />
          <Text style={styles.addressText}>{order.address || 'Endereço não informado'}</Text>
        </TouchableOpacity>

        {order.observation ? (
          <View style={styles.observationBox}>
            <FileText size={14} color="#fbbf24" style={{ marginTop: 2 }} />
            <Text style={styles.observationText}>{order.observation}</Text>
          </View>
        ) : null}

        {/* Payment and Total */}
        <View style={styles.paymentRow}>
          <View style={styles.paymentMethodBadge}>
            <DollarSign size={13} color="#94a3b8" />
            <Text style={styles.paymentMethodText}>
              {formatPaymentMethod(order.paymentMethod)}
            </Text>
          </View>

          <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
        </View>

        {/* Expandable items toggle */}
        {order.items && order.items.length > 0 && (
          <TouchableOpacity
            style={styles.itemsToggle}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.6}
          >
            <Text style={styles.itemsToggleText}>
              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'} no pedido
            </Text>
            {expanded ? (
              <ChevronUp size={16} color="#94a3b8" />
            ) : (
              <ChevronDown size={16} color="#94a3b8" />
            )}
          </TouchableOpacity>
        )}

        {expanded && order.items && (
          <View style={styles.itemsList}>
            {order.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.quantity || 1}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatCurrency((item.price || 0) * (item.quantity || 1))}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons: Maps, Waze, WhatsApp, Call */}
      {!isDelivered && (
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.btnMaps]}
            onPress={() => openGoogleMaps(order.address)}
            activeOpacity={0.7}
          >
            <Navigation size={14} color="#38bdf8" />
            <Text style={styles.quickActionTextBlue}>Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.btnWaze]}
            onPress={() => openWaze(order.address)}
            activeOpacity={0.7}
          >
            <Navigation size={14} color="#a855f7" />
            <Text style={styles.quickActionTextPurple}>Waze</Text>
          </TouchableOpacity>

          {order.customerPhone ? (
            <>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.btnWhatsApp]}
                onPress={handleWhatsApp}
                activeOpacity={0.7}
              >
                <MessageSquare size={14} color="#22c55e" />
                <Text style={styles.quickActionTextGreen}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, styles.btnPhone]}
                onPress={() => callPhone(order.customerPhone)}
                activeOpacity={0.7}
              >
                <Phone size={14} color="#94a3b8" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {/* Main Status Change Action */}
      {isAvailable && (
        <TouchableOpacity
          style={styles.startDeliveryButton}
          onPress={() => onStartDelivery(order.id)}
          activeOpacity={0.8}
        >
          <Bike size={18} color="#020617" strokeWidth={2.5} />
          <Text style={styles.startDeliveryButtonText}>Iniciar Entrega</Text>
        </TouchableOpacity>
      )}

      {isInRoute && (
        <TouchableOpacity
          style={styles.completeDeliveryButton}
          onPress={() => onCompleteDelivery(order)}
          activeOpacity={0.8}
        >
          <CheckCircle size={18} color="#ffffff" strokeWidth={2.5} />
          <Text style={styles.completeDeliveryButtonText}>Marcar como Entregue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardInRoute: {
    borderColor: '#f59e0b',
    backgroundColor: '#131c31',
    borderWidth: 1.5,
  },
  cardAvailable: {
    borderColor: '#38bdf8',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderIdBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderIdText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
  },
  orderTime: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusAvailableBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  statusAvailableText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '900',
  },
  statusInRouteBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusInRouteText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
  },
  statusDeliveredBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDeliveredText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '900',
  },
  body: {
    marginBottom: 12,
  },
  customerName: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '800',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  addressIcon: {
    marginTop: 2,
    marginRight: 6,
  },
  addressText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  observationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  observationText: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  orderTotal: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '900',
  },
  itemsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  itemsToggleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsList: {
    backgroundColor: '#090d16',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemQty: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
    width: 26,
  },
  itemName: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
  },
  itemPrice: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  btnMaps: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  quickActionTextBlue: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  btnWaze: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  quickActionTextPurple: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  btnWhatsApp: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  quickActionTextGreen: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },
  btnPhone: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    flex: 0,
    paddingHorizontal: 10,
  },
  startDeliveryButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startDeliveryButtonText: {
    color: '#020617',
    fontSize: 14,
    fontWeight: '900',
  },
  completeDeliveryButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  completeDeliveryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
