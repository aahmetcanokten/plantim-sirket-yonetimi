import React, { useEffect, useState, useContext } from "react";
import { Platform, View, ActivityIndicator, StyleSheet, AppState } from "react-native";
import { enableScreens } from 'react-native-screens';
import './i18n';
import { useTranslation } from 'react-i18next';

enableScreens();
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { AppProvider, AppContext } from "./AppContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import { registerForPushNotificationsAsync, checkAndTriggerLowStockNotification, resetBadgeCount } from "./utils/NotificationHelper";

import { SafeAreaProvider } from 'react-native-safe-area-context';

import StockScreen from "./screens/StockScreen";
import SalesScreen from "./screens/SalesScreen";
import CustomerScreen from "./screens/CustomerScreen";
import PurchasesScreen from "./screens/PurchasesScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import DetailedStockScreen from "./screens/DetailedStockScreen";
import AddProductScreen from "./screens/AddProductScreen";
import PersonnelScreen from "./screens/PersonnelScreen";
import TaskListScreen from "./screens/TaskListScreen";
import AssetManagementScreen from "./screens/AssetManagementScreen"; // YENİ
import AssemblyScreen from "./screens/AssemblyScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import LoginScreen from "./screens/LoginScreen";
import PaywallScreen from "./screens/PaywallScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineNotice from "./components/OfflineNotice";
import WebContainer from "./components/WebContainer";

import { Ionicons } from "@expo/vector-icons";
import { Colors } from "./Theme";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// REKLAM BİRİMİ ID'si KALDIRILDI
// Uygulama Açılış Reklamı Nesnesi KALDIRILDI

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      initialRouteName="Stok"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = "cube-outline";
          if (route.name === "Satışlar") iconName = "cash-outline";
          else if (route.name === "Stok") iconName = "cube-outline";
          else if (route.name === "Satın Alma") iconName = "cart-outline";
          else if (route.name === "Müşteriler") iconName = "people-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.secondary,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 90 : (Platform.OS === 'web' ? 70 : 60),
          borderTopWidth: 0,
          backgroundColor: "#fff",
          ...(Platform.OS === "ios"
            ? {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }
            : { elevation: 8 }),
        },
      })}
    >
      <Tab.Screen name="Stok" component={StockScreen} options={{ tabBarLabel: t('stock') }} />
      <Tab.Screen name="Satışlar" component={SalesScreen} options={{ tabBarLabel: t('sales') }} />
      <Tab.Screen name="Satın Alma" component={PurchasesScreen} options={{ tabBarLabel: t('purchasing') }} />
      <Tab.Screen name="Müşteriler" component={CustomerScreen} options={{ tabBarLabel: t('customers') }} />
    </Tab.Navigator>
  );
}


function RootNavigator() {
  const { session, loading, isPasswordReset } = useAuth();
  const { isPremium, products } = useContext(AppContext);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  // Uygulama açıldığında veya ürünler değiştiğinde stok kontrolü yap
  useEffect(() => {
    if (session && products && products.length > 0) {
      checkAndTriggerLowStockNotification(products);
    }
  }, [products, session]);

  useEffect(() => {
    AsyncStorage.getItem('alreadyLaunched').then(value => {
      if (value == null) {
        setIsFirstLaunch(true); // First time launch
      } else {
        setIsFirstLaunch(false); // Already launched
      }
    });
  }, []);

  if (loading || isFirstLaunch === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        isPasswordReset ? (
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Ayarlar" component={SettingsScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="DetailedStockScreen" component={DetailedStockScreen} />
            <Stack.Screen name="AddProductScreen" component={AddProductScreen} />
            <Stack.Screen name="PersonnelScreen" component={PersonnelScreen} />
            <Stack.Screen name="TaskListScreen" component={TaskListScreen} />
            <Stack.Screen name="AssetManagementScreen" component={AssetManagementScreen} />
            <Stack.Screen name="AssemblyScreen" component={AssemblyScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
          </>
        )
      ) : (
        <>
          {isFirstLaunch && Platform.OS !== 'web' && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const getActiveRouteName = (state) => {
  if (!state || !state.routes) return null;
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return { name: route.name, params: route.params };
};

export default function App() {
  const [activeRoute, setActiveRoute] = useState(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    resetBadgeCount();

    // Check for saved language preference
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('user-language');
        if (savedLanguage) {
          const i18nInstance = require('./i18n').default;
          i18nInstance.changeLanguage(savedLanguage);
        }
      } catch (e) {
        console.error("Failed to load language", e);
      }
    };
    loadLanguage();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        resetBadgeCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <OfflineNotice />
          <AppProvider>
            <ToastProvider>
              <NavigationContainer
                onStateChange={(state) => {
                  const routeInfo = getActiveRouteName(state);
                  setActiveRoute(routeInfo);
                }}
              >
                <WebContainer activeRoute={activeRoute}>
                  <RootNavigator />
                </WebContainer>
              </NavigationContainer>
            </ToastProvider>
          </AppProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});