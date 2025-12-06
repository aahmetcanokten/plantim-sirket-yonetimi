import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { Animated, View, Text, StyleSheet, Dimensions } from "react-native";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const anim = useRef(new Animated.Value(0)).current;
  const [visibleMsg, setVisibleMsg] = useState(null);

  // GÜNCELLENDİ: showNext, animasyon bittiğinde setTimeout ile kendi kendini tekrar çağırmamalı.
  // Bu işlevi alttaki useEffect üstlenecektir.
  const showNext = useCallback(() => {
    if (queue.length === 0 || visibleMsg) return; // Eğer zaten bir mesaj görünüyorsa veya kuyruk boşsa çık

    // Kuyruktaki ilk elemanı al ve gösterime başla
    const next = queue[0];
    setVisibleMsg(next);
    
    // Animasyonu başlat
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800), // Mesajın görünme süresi
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Animasyon tamamlandığında:
      // 1. Kuyruktan gösterilen mesajı sil
      setQueue((q) => q.slice(1));
      // 2. Görünür mesajı null yap (bu, alttaki useEffect'i tetikleyecektir)
      setVisibleMsg(null);
    });
  }, [anim, queue, visibleMsg]); // visibleMsg'yi dependency'ye ekledik

  // showToast, sadece kuyruğa mesaj ekler.
  const showToast = useCallback((message) => {
    setQueue((q) => {
      const next = [...q, message];
      return next;
    });
  }, []);

  // watch queue - Sadece bu useEffect, kuyrukta mesaj varken ve şu anda
  // bir mesaj görünmüyorken (visibleMsg === null) bir sonraki mesajı tetiklemelidir.
  React.useEffect(() => {
    // visibleMsg'nin null olmasını bekleyerek, önceki animasyonun bitmesini garanti ederiz.
    if (!visibleMsg && queue.length > 0) {
        showNext();
    }
  }, [queue, visibleMsg, showNext]); // visibleMsg bağımlılığı, sadece bittiğinde yeni mesajı çeker

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visibleMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Text style={styles.text}>{visibleMsg}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#0B1220",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  text: { color: "#fff", fontWeight: "700" },
});