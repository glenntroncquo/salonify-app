import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>List view placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 16,
    color: '#1b1b1b',
  },
});
