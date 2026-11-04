// TalApp+ abonelikleri (RevenueCat). Anahtar girilmediyse ya da Expo Go'da modül yoksa satın alma kapalı kalır.
// RevenueCat'te iki entitlement: p10 (haftada 10 talep) ve inf (sınırsız).
// Offering'deki paketlerin identifier'ları: p10_week, p10_month, inf_week, inf_month.
import { Platform } from 'react-native';
import { REVENUECAT_IOS_KEY } from './config';

let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  // Paket yüklenemedi: satın alma kapalı
}

let configured = false;
const ORDER = ['inf', 'p10']; // ikisi de aktifse sınırsız geçerli

export const purchasesEnabled = () => !!Purchases && !!REVENUECAT_IOS_KEY && Platform.OS === 'ios';

const planFrom = info => {
  const active = (info && info.entitlements && info.entitlements.active) || {};
  return ORDER.find(k => active[k]) || 'free';
};

// Girişte çağrılır; aktif planı döner
export async function initPurchases(userId) {
  if (!purchasesEnabled()) return 'free';
  try {
    if (!configured) {
      Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: userId });
      configured = true;
    } else {
      await Purchases.logIn(userId);
    }
    return planFrom(await Purchases.getCustomerInfo());
  } catch (e) {
    return 'free';
  }
}

// Abonelik başka yerde değişince (yenileme, iptal) haber verir
export function onPlanChange(cb) {
  if (!purchasesEnabled() || !configured) return () => {};
  const listener = info => cb(planFrom(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

// App Store'daki paketler: { p10_week, p10_month, inf_week, inf_month }
export async function getPackages() {
  if (!purchasesEnabled() || !configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const list = (offerings.current && offerings.current.availablePackages) || [];
    const out = {};
    list.forEach(p => { out[p.identifier] = p; });
    return out;
  } catch (e) {
    return null;
  }
}

// Satın alır ve yeni planı döner; kullanıcı vazgeçerse hata.userCancelled true olur
export async function buy(pkg) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return planFrom(customerInfo);
}

export async function restore() {
  return planFrom(await Purchases.restorePurchases());
}

export async function logOutPurchases() {
  if (!purchasesEnabled() || !configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    // Zaten anonim kullanıcı
  }
}
