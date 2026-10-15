import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Bike, Settings, User } from 'lucide-react-native';

export const Header = ({
  storeName,
  driverName,
  isOnline,
  onToggleOnline,
  onPressSettings,
  onPressProfile,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.iconWrapper}>
            <Bike size={22} color="#0f172a" strokeWidth={2.5} />
          </View>
          <View style={styles.titleWrapper}>
            <Text style={styles.storeName} numberOfLines={1}>
              {storeName || 'SDG Delivery'}
            </Text>
            <TouchableOpacity onPress={onPressProfile} style={styles.driverBadge}>
              <User size={12} color="#f59e0b" />
              <Text style={styles.driverName} numberOfLines={1}>
                {driverName}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <View style={[styles.statusBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <Text style={[styles.statusText, isOnline ? styles.textOnline : styles.textOffline]}>
              {isOnline ? 'ONLINE' : 'PAUSA'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={onToggleOnline}
              trackColor={{ false: '#334155', true: '#059669' }}
              thumbColor={isOnline ? '#34d399' : '#94a3b8'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onPressSettings}
            activeOpacity={0.7}
          >
            <Settings size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleWrapper: {
    flex: 1,
  },
  storeName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  driverName: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 2,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeOnline: {
    backgroundColor: 'rgba(6, 78, 59, 0.4)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(76, 29, 29, 0.4)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  dotOnline: {
    backgroundColor: '#34d399',
  },
  dotOffline: {
    backgroundColor: '#f87171',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 2,
  },
  textOnline: {
    color: '#34d399',
  },
  textOffline: {
    color: '#f87171',
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
});
