import { Platform } from 'react-native';

/**
 * Web-specific style utilities for consistent web experience
 * Bu yardımcı fonksiyonlar, web platformunda tutarlı bir kullanıcı deneyimi sağlar
 */

// Web için temel buton stilleri (cursor pointer, hover efektleri)
export const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.15s ease',
} : {};

// Hover efekti için opacity değişimi
export const webHoverOpacity = Platform.OS === 'web' ? {
    ':hover': {
        opacity: 0.8,
    }
} : {};

// Web modal overlay stilleri (merkezi konumlandırma)
export const webModalOverlay = Platform.OS === 'web' ? {
    justifyContent: 'center',
    alignItems: 'center',
} : {
    justifyContent: 'flex-end',
    alignItems: 'stretch',
};

// Web modal container stilleri (maksimum genişlik ve yükseklik)
export const webModalContainer = Platform.OS === 'web' ? {
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
} : {};

// Web modal wrapper stilleri (shadow ve border-radius)
export const webModalWrapper = Platform.OS === 'web' ? {
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
} : {};

// Tablo görünümü için web kontrolü
export const isWebDesktop = () => {
    return Platform.OS === 'web' && (typeof window !== 'undefined' && window.innerWidth > 768);
};

// Web'de input focus stilleri
export const webInputFocus = Platform.OS === 'web' ? {
    outlineStyle: 'none',
    borderColor: '#0A84FF',
} : {};

// Web'de tıklanabilir öğeler için stil helper
export const makeWebClickable = (baseStyle = {}) => ({
    ...baseStyle,
    ...webButtonStyle,
});

// Web için tablo row hover efekti
export const webTableRowHover = Platform.OS === 'web' ? {
    ':hover': {
        backgroundColor: '#F8FAFC',
    }
} : {};
