import React, { useContext } from 'react';
import { View } from 'react-native';
// import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AppContext } from '../AppContext';

// Gerçek AdMob Unit ID'nizi buraya yazın. Test için TestIds.BANNER kullanıyoruz.
// const adUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyy';

export default function AdBanner() {
  const { isPremium } = useContext(AppContext);

  return null;
}