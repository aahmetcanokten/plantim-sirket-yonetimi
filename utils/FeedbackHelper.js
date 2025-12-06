import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Haptic (Titreşim) Tipleri
export const HapticType = {
    SELECTION: 'selection', // Hafif tık (butonlar için)
    SUCCESS: 'success',     // Başarılı işlem
    ERROR: 'error',         // Hata uyarısı
    WARNING: 'warning',     // Uyarı
    IMPACT_LIGHT: 'impactLight',
    IMPACT_MEDIUM: 'impactMedium',
    IMPACT_HEAVY: 'impactHeavy',
};

/**
 * Titreşim geri bildirimi tetikler.
 * @param {string} type - HapticType enum'ından bir değer
 */
export const triggerHaptic = async (type = HapticType.SELECTION) => {
    try {
        switch (type) {
            case HapticType.SELECTION:
                await Haptics.selectionAsync();
                break;
            case HapticType.SUCCESS:
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                break;
            case HapticType.ERROR:
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                break;
            case HapticType.WARNING:
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                break;
            case HapticType.IMPACT_LIGHT:
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;
            case HapticType.IMPACT_MEDIUM:
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                break;
            case HapticType.IMPACT_HEAVY:
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                break;
        }
    } catch (error) {
        // Haptic desteklenmiyorsa veya hata olursa sessizce geç
        console.log("Haptic error:", error);
    }
};

/**
 * Akıllı Mağaza Değerlendirmesi İsteği
 * Kullanıcıyı çok sık rahatsız etmemek için kontrol yapar.
 * İşlem (action) sayısını sayar ve belirli eşiklerde (örn: 5, 20, 50. işlemde) review ister.
 */
export const requestStoreReview = async () => {
    try {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (!isAvailable) return;

        // İşlem sayısını al
        const countStr = await AsyncStorage.getItem('actionCountForReview');
        let count = countStr ? parseInt(countStr) : 0;
        count += 1;
        await AsyncStorage.setItem('actionCountForReview', count.toString());

        // Eşik değerler: 5. işlemde, 20. işlemde ve 50. işlemde sor
        if ([5, 20, 50].includes(count)) {
            await StoreReview.requestReview();
        }
    } catch (error) {
        console.log("Store review error:", error);
    }
};
