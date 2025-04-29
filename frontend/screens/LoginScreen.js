import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Clean up the password by removing any prefixes
      const cleanPassword = formData.password.replace(/^Password:\s*/i, '');
      await login({ ...formData, password: cleanPassword });
      navigation.replace('Home');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Surface style={styles.surface}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <Text style={styles.logo}>Pinterest</Text>
            <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </TouchableWithoutFeedback>

        <TextInput
          mode="outlined"
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          theme={{ colors: { primary: '#E60023' } }}
        />

        <TextInput
          mode="outlined"
          label="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
          style={styles.input}
          theme={{ colors: { primary: '#E60023' } }}
        />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              style={styles.button}
              buttonColor="#E60023"
            >
              Login
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              style={styles.linkButton}
              textColor="#E60023"
            >
              Don't have an account? Sign up
            </Button>
          </View>
        </TouchableWithoutFeedback>
      </Surface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  surface: {
    flex: 1,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: '#ffffff',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E60023',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#111111',
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 8,
    borderRadius: 24,
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 8,
  },
  error: {
    color: '#E60023',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
});

export default LoginScreen; 