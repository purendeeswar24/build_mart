import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { AuthFlowScreen } from '../../screens/auth/AuthFlowScreen';

export function LoginModal() {
  const { loginModalVisible, closeLoginModal } = useAuth();

  return (
    <Modal
      visible={loginModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeLoginModal}
    >
      <View style={styles.wrap}>
        <AuthFlowScreen asModal onClose={closeLoginModal} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
