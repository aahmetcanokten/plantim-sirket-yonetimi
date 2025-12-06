import React from "react";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { AppProvider } from "./AppContext"; // Mevcut AppContext
import { AuthProvider, useAuth } from "./AuthContext"; // YENİ: AuthContext
import { ToastProvider } from "./components/ToastProvider";

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
// YENİ: Giriş Ekranı (Oluşturulması Gerekiyor)
import LoginScreen from "./screens/LoginScreen";

import { Ionicons } from "@expo/vector-icons";
import { Colors } from "./Theme";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Ana Sekme Gezginimiz
function MainTabs() {
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
          height: Platform.OS === "ios" ? 90 : 60,
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
      <Tab.Screen name="Stok" component={StockScreen} />
      <Tab.Screen name="Satışlar" component={SalesScreen} />
      <Tab.Screen name="Satın Alma" component={PurchasesScreen} />
      <Tab.Screen name="Müşteriler" component={CustomerScreen} />
    </Tab.Navigator>
  );
}

// Ana Gezgin - Oturum durumuna göre ekranları gösterir
function RootNavigator() {
  const { session, loading } = useAuth(); // useAuth burada çağrılmalı

  if (loading) {
    // Auth durumu yüklenirken bir yükleme ekranı göster
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session ? (
        // Kullanıcı giriş yapmışsa ana uygulama ekranlarını göster
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Ayarlar" component={SettingsScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} /> 
          <Stack.Screen name="DetailedStockScreen" component={DetailedStockScreen} />
          <Stack.Screen name="AddProductScreen" component={AddProductScreen} />
          <Stack.Screen name="PersonnelScreen" component={PersonnelScreen} />
          <Stack.Screen name="TaskListScreen" component={TaskListScreen} />
        </>
      ) : (
        // Kullanıcı giriş yapmamışsa Login ekranını göster
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

// Ana Uygulama Bileşeni
export default function App() {
  return (
    // AuthProvider'ı AppProvider'ın dışına veya içine koyabilirsiniz. 
    // AuthProvider'ın diğer tüm Context'leri sarmalaması idealdir.
    <AuthProvider> 
      <AppProvider>
        <ToastProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});