import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { fetchOrder, OrderDetail } from '@/lib/api/orders';

function formatDateTime(value: string) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function itemName(item: OrderDetail['order_item'][number]) {
  if (item.treatment?.name && item.price_option?.name) return `${item.treatment.name} · ${item.price_option.name}`;
  return item.treatment?.name ?? item.product?.name ?? '—';
}

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchOrder(id)
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : t('order.failedToLoad')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const clientName = order
    ? `${order.client?.first_name ?? ''} ${order.client?.last_name ?? ''}`.trim() || t('calendar.unknownClient')
    : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {order?.order_number ?? t('order.title')}
        </Text>
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
      ) : !order ? null : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('client.title')}</Text>
            <Text style={styles.value}>{clientName}</Text>
            <Text style={styles.subvalue}>{formatDateTime(order.date ?? order.created_at)}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('appointment.treatments')}</Text>
            {order.order_item.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>{itemName(item)}</Text>
                <Text style={styles.itemPrice}>{`€${(item.total ?? item.unit_price ?? 0).toFixed(2)}`}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('checkout.total')}</Text>
              <Text style={styles.totalValue}>{`€${(order.total_amount ?? 0).toFixed(2)}`}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('order.payments')}</Text>
            {order.payment.length === 0 ? (
              <Text style={styles.subvalue}>{t('order.noPayments')}</Text>
            ) : (
              order.payment.map((payment) => (
                <View key={payment.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {payment.payment_method ? t(`checkout.paymentTypes.${payment.payment_method}`) : '—'}
                  </Text>
                  <Text style={styles.itemPrice}>{`€${(payment.amount_gross ?? 0).toFixed(2)}`}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1b',
    textAlign: 'center',
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b8b8b',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  subvalue: {
    fontSize: 13,
    color: '#8b8b8b',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 15,
    color: '#1b1b1b',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b1b1b',
  },
});
