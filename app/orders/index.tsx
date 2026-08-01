import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import { fetchOrders, OrderListItem } from '@/lib/api/orders';

function statusStyle(status: string | null) {
  if (status === 'paid') return { backgroundColor: '#D1FAE5', color: '#064E3B' };
  if (status === 'partial') return { backgroundColor: '#FEF3C7', color: '#78350F' };
  return { backgroundColor: '#FFE4E6', color: '#881337' };
}

function formatDate(value: string) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function OrdersListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();

  const [orders, setOrders] = React.useState<OrderListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchOrders(companyId);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('order.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1b1b1b" />
        </View>
      ) : showNoCompanyState ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{t('calendar.noCompany')}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>{t('order.noOrders')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const clientName =
              `${item.client?.first_name ?? ''} ${item.client?.last_name ?? ''}`.trim() || t('calendar.unknownClient');
            const badge = statusStyle(item.payment_status);
            return (
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowClient}>{clientName}</Text>
                  <Text style={styles.rowDate}>{formatDate(item.date ?? item.created_at)}</Text>
                </View>
                <Text style={styles.rowTotal}>{`€${(item.total_amount ?? 0).toFixed(2)}`}</Text>
                <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {t(`order.status.${item.payment_status ?? 'unpaid'}`)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
  },
  errorBannerText: {
    color: '#881337',
    fontSize: 13,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  stateText: {
    fontSize: 15,
    color: '#8b8b8b',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowClient: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  rowDate: {
    fontSize: 13,
    color: '#8b8b8b',
    marginTop: 2,
  },
  rowTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
