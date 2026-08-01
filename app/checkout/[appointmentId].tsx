import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth-context';
import {
  CheckoutLineItem,
  CheckoutPaymentType,
  checkoutLineItems,
  createOrderWithPayment,
  fetchAppointmentForCheckout,
} from '@/lib/api/checkout';

const PAYMENT_TYPES: CheckoutPaymentType[] = ['cash', 'card', 'invoice', 'bank_transfer'];

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { companyId } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [clientName, setClientName] = React.useState('');
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [lineItems, setLineItems] = React.useState<CheckoutLineItem[]>([]);

  const [paymentType, setPaymentType] = React.useState<CheckoutPaymentType>('cash');
  const [amount, setAmount] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    fetchAppointmentForCheckout(appointmentId)
      .then((appointment) => {
        if (!appointment) {
          setError(t('checkout.failedToLoad'));
          return;
        }
        const items = checkoutLineItems(appointment);
        setLineItems(items);
        setClientId(appointment.client_id);
        setClientName(
          `${appointment.client?.first_name ?? ''} ${appointment.client?.last_name ?? ''}`.trim() ||
            t('calendar.unknownClient')
        );
        const total = items.reduce((sum, item) => sum + item.price, 0);
        setAmount(total.toFixed(2));
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('checkout.failedToLoad')))
      .finally(() => setLoading(false));
  }, [appointmentId, t]);

  const total = lineItems.reduce((sum, item) => sum + item.price, 0);
  const amountValue = Number(amount);
  const canSubmit = lineItems.length > 0 && Number.isFinite(amountValue) && amountValue >= 0 && !submitting;

  const handleComplete = async () => {
    if (!companyId || !appointmentId || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createOrderWithPayment({
        companyId,
        appointmentId,
        clientId: clientId ?? undefined,
        lineItems,
        paymentType,
        amount: amountValue,
      });
      setOrderNumber(result.order_number ?? null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.failedToComplete'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#1b1b1b" />
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.successContainer}>
          <MaterialIcons name="check-circle" size={64} color="#20b87b" />
          <Text style={styles.successTitle}>{t('checkout.success')}</Text>
          {orderNumber ? <Text style={styles.successSubtitle}>{orderNumber}</Text> : null}
          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>{t('checkout.done')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="close" size={24} color="#1b1b1b" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('checkout.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('client.title')}</Text>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.treatments')}</Text>
          {lineItems.length === 0 ? (
            <Text style={styles.emptyText}>{t('checkout.noLineItems')}</Text>
          ) : (
            lineItems.map((item, index) => (
              <View key={`${item.treatmentId}-${index}`} style={styles.lineItemRow}>
                <Text style={styles.lineItemName}>{item.name}</Text>
                <Text style={styles.lineItemPrice}>{`€${item.price.toFixed(2)}`}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('checkout.total')}</Text>
            <Text style={styles.totalValue}>{`€${total.toFixed(2)}`}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('checkout.paymentMethod')}</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_TYPES.map((type) => {
              const isSelected = paymentType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.paymentChip, isSelected && styles.paymentChipActive]}
                  onPress={() => setPaymentType(type)}>
                  <Text style={[styles.paymentChipText, isSelected && styles.paymentChipTextActive]}>
                    {t(`checkout.paymentTypes.${type}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('checkout.amount')}</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.completeButton, !canSubmit && styles.completeButtonDisabled]} onPress={handleComplete} disabled={!canSubmit}>
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.completeButtonText}>{t('checkout.complete')}</Text>
          )}
        </Pressable>
      </View>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b8b8b',
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  emptyText: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lineItemName: {
    fontSize: 15,
    color: '#1b1b1b',
  },
  lineItemPrice: {
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
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7e7e7',
  },
  paymentChipActive: {
    backgroundColor: '#1b1b1b',
    borderColor: '#1b1b1b',
  },
  paymentChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1b',
  },
  paymentChipTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e7e7e7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1b1b1b',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  completeButton: {
    backgroundColor: '#1b1b1b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b1b1b',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#8b8b8b',
  },
  doneButton: {
    marginTop: 16,
    backgroundColor: '#1b1b1b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
