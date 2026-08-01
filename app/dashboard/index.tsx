import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MonthlyBarChart } from '@/components/monthly-bar-chart';
import { useAuth } from '@/contexts/auth-context';
import { fetchMonthlyAppointments, fetchMonthlyClients, fetchRevenue, MonthlyCountData, RevenueData } from '@/lib/api/dashboard';

import { getMonthShortLabel } from '../(tabs)/calendar/date-utils';

const RECENT_MONTHS = 6;

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();

  const [revenue, setRevenue] = React.useState<RevenueData | null>(null);
  const [appointments, setAppointments] = React.useState<MonthlyCountData | null>(null);
  const [clients, setClients] = React.useState<MonthlyCountData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const [revenueData, appointmentsData, clientsData] = await Promise.all([
        fetchRevenue(companyId),
        fetchMonthlyAppointments(companyId),
        fetchMonthlyClients(companyId),
      ]);
      setRevenue(revenueData);
      setAppointments(appointmentsData);
      setClients(clientsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.failedToLoad'));
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
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {revenue ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('dashboard.revenue')}</Text>
              <Text style={styles.cardHeadline}>{`€${revenue.totalRevenue.toFixed(2)}`}</Text>
              <Text style={styles.cardHint}>{t('dashboard.last12Months')}</Text>
              <MonthlyBarChart
                data={revenue.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                  label: getMonthShortLabel(m.monthIndex),
                  values: [m.revenue, m.revenueExclVat],
                }))}
                series={[
                  { label: t('dashboard.revenueGross'), color: '#1b1b1b' },
                  { label: t('dashboard.revenueNet'), color: '#c6c6c6' },
                ]}
                formatValue={(value) => `€${value.toFixed(0)}`}
              />
            </View>
          ) : null}

          {appointments ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('dashboard.appointments')}</Text>
              <Text style={styles.cardHeadline}>{appointments.total}</Text>
              <Text style={styles.cardHint}>{t('dashboard.last12Months')}</Text>
              <MonthlyBarChart
                data={appointments.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                  label: getMonthShortLabel(m.monthIndex),
                  values: [m.count],
                }))}
                series={[{ label: t('dashboard.appointments'), color: '#1b1b1b' }]}
                formatValue={(value) => String(Math.round(value))}
              />
            </View>
          ) : null}

          {clients ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('dashboard.clients')}</Text>
              <Text style={styles.cardHeadline}>{clients.total}</Text>
              <Text style={styles.cardHint}>{t('dashboard.last12Months')}</Text>
              <MonthlyBarChart
                data={clients.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                  label: getMonthShortLabel(m.monthIndex),
                  values: [m.count],
                }))}
                series={[{ label: t('dashboard.clients'), color: '#1b1b1b' }]}
                formatValue={(value) => String(Math.round(value))}
              />
            </View>
          ) : null}
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
  stateText: {
    fontSize: 15,
    color: '#8b8b8b',
  },
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 48,
  },
  card: {
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 16,
    padding: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8b8b8b',
    textTransform: 'uppercase',
  },
  cardHeadline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b1b1b',
    marginTop: 4,
  },
  cardHint: {
    fontSize: 12,
    color: '#9a9a9a',
    marginBottom: 16,
  },
});
