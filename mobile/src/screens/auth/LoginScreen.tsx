import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, I18nManager } from 'react-native';
import { useAuthStore } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { t, isRTL } = useI18n();

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return; }
    setLoading(true);
    try { await login(email, password); }
    catch (e: any) { Alert.alert('Error', e.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}><Text style={styles.logoText}>🌳</Text></View>
          <Text style={styles.title}>Learning Tree Connect</Text>
          <Text style={styles.subtitle}>{isRTL ? 'منصة إدارة الحضانات' : 'Nursery Management Platform'}</Text>
        </View>
        <View style={styles.form}>
          <Text style={[styles.label, isRTL && styles.rtlText]}>{t.email}</Text>
          <TextInput style={[styles.input, isRTL && styles.rtlInput]} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Text style={[styles.label, isRTL && styles.rtlText]}>{t.password}</Text>
          <TextInput style={[styles.input, isRTL && styles.rtlInput]} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t.loading : t.login}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { fontSize: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 3 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  rtlText: { textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#f9fafb' },
  rtlInput: { textAlign: 'right' },
  button: { backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
