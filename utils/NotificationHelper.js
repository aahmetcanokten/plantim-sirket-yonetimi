import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Bildirimlerin nasıl görüneceğini yapılandır (Uygulama açıkken bile)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        // İzin verilmediyse kullanıcıyı darlamayalım, sessizce dön
        console.log('Bildirim izni alınamadı!');
        return;
    }

    return finalStatus;
}

export async function scheduleShipmentNotification(productName, shipmentDateISO) {
    try {
        const shipmentDate = new Date(shipmentDateISO);
        const now = new Date();

        if (shipmentDate <= now) return;

        const trigger = {
            date: shipmentDate,
        };

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Sevkiyat Zamanı! 🚚",
                body: `${productName} ürününün sevkiyat tarihi geldi.`,
                sound: true,
                data: { productName, shipmentDate: shipmentDateISO },
            },
            trigger,
        });

        console.log(`Bildirim kuruldu: ${productName} - ${shipmentDate}`);
    } catch (error) {
        console.log("Bildirim kurulamadı:", error);
    }
}

/**
 * Stokları kontrol eder ve kritik seviyenin altındakiler için bildirim gönderir.
 * @param {Array} products - Ürün listesi
 */
export async function checkAndTriggerLowStockNotification(products) {
    try {
        // Kritik seviyedeki ürünleri filtrele (Stok <= Kritik Limit)
        // Eğer kritik limit null ise varsayılan olarak 5 kabul etmeyelim, 0'dan büyük ve kritik limite eşit/küçük
        const lowStockProducts = products.filter(p => {
            const limit = p.criticalStockLimit ?? 0;
            const qty = p.quantity ?? 0;
            return limit > 0 && qty <= limit && qty > 0; // Sadece kritik seviyede olanlar (tükenmişler değil)
        });

        if (lowStockProducts.length === 0) return;

        // Mesaj oluştur
        const firstProduct = lowStockProducts[0];
        const count = lowStockProducts.length;
        let body = "";

        if (count === 1) {
            body = `${firstProduct.name} stok seviyesi kritik (${firstProduct.quantity} adet kaldı).`;
        } else {
            body = `${firstProduct.name} ve ${count - 1} diğer ürünün stoku kritik seviyede!`;
        }

        // Bildirim gönder (Hemen)
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Stok Uyarısı ⚠️",
                body: body,
                sound: true,
                badge: 1,
            },
            trigger: null, // Hemen gönder
        });

    } catch (error) {
        console.log("Stok bildirimi hatası:", error);
    }
}
