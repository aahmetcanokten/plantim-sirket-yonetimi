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

        // Saat ayarı: Bildirimlerin sabah 09:00'da gelmesi daha kullanıcı dostu olabilir
        // Eğer shipmentDateISO'da saat bilgisi varsa onu koruruz, yoksa veya 00:00 ise sabah 9 yaparız.
        // Ancak basitlik adına, verilen saati baz alıyoruz.

        const now = new Date();

        // 1. TAM GÜNÜNDE BİLDİRİM
        if (shipmentDate > now) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Sevkiyat Günü Geldi! 🚛",
                    body: `${productName} için bugün sevkiyat günü.`,
                    sound: true,
                    data: { productName, shipmentDate: shipmentDateISO },
                },
                trigger: { date: shipmentDate },
            });
            console.log(`Bildirim kuruldu (Gün): ${productName} - ${shipmentDate}`);
        }

        // 2. İKİ GÜN ÖNCE BİLDİRİM
        const twoDaysBefore = new Date(shipmentDate);
        twoDaysBefore.setDate(shipmentDate.getDate() - 2);

        // Eğer 2 gün öncesi şu andan ilerideyse kur
        if (twoDaysBefore > now) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Sevkiyat Yaklaşıyor ⏳",
                    body: `${productName} ürününün sevkiyatına 2 gün kaldı.`,
                    sound: true,
                    data: { productName, shipmentDate: shipmentDateISO },
                },
                trigger: { date: twoDaysBefore },
            });
            console.log(`Bildirim kuruldu (2 Gün Önce): ${productName} - ${twoDaysBefore}`);
        }

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
