import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANY_KEY = 'gleami.selectedCompanyId';
const locationKey = (companyId: string) => `gleami.selectedLocationId.${companyId}`;

export async function readPreferredCompanyId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(COMPANY_KEY);
  } catch {
    return null;
  }
}

export async function writePreferredCompanyId(companyId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPANY_KEY, companyId);
  } catch {
    // Preference write is best-effort — hydrate must still finish.
  }
}

export async function readPreferredLocationId(companyId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(locationKey(companyId));
  } catch {
    return null;
  }
}

export async function writePreferredLocationId(companyId: string, locationId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(locationKey(companyId), locationId);
  } catch {
    // Preference write is best-effort — hydrate must still finish.
  }
}
