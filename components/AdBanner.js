import React, { useContext } from 'react';
import { View } from 'react-native';
// import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AppContext } from '../AppContext';

// Gerçek AdMob Unit ID'nizi buraya yazın. Test için TestIds.BANNER kullanıyoruz.
// const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-9871632249659665/1335830647';

export default function AdBanner() {
  const { isPremium } = useContext(AppContext);

  // Reklam kütüphanesi kaldırıldığı için her zaman null döndür
  return null;

  /*
  // Eğer kullanıcı Premium ise reklam gösterme (null döndür)
  if (isPremium) {
    return null;
  }

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
  */
}