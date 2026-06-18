import React, { useEffect } from 'react';
import { I18nManager } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/hooks/useAuth';

export default function App() {
  const { checkAuth, language } = useAuthStore();

  useEffect(() => {
    checkAuth();
    const isRTL = language === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  }, []);

  return <AppNavigator />;
}
