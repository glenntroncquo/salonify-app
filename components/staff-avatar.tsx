import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getCompanyImageUrl } from '@/lib/storage';
import { getInitialsFromLabel } from '@/lib/text';

type Props = {
  imagePath: string | null | undefined;
  name: string;
  size: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
};

/** Staff avatar: real photo when `imagePath` resolves, else a centered initials circle. */
export function StaffAvatar({ imagePath, name, size, backgroundColor = '#d8cfc6', textColor = '#4a4a4a', fontSize }: Props) {
  const uri = getCompanyImageUrl(imagePath ?? null);
  const circleSize = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, circleSize]} contentFit="cover" />;
  }

  return (
    <View style={[styles.circle, circleSize, { backgroundColor }]}>
      <Text style={{ fontSize: fontSize ?? Math.max(9, Math.round(size * 0.4)), fontWeight: '700', color: textColor }}>
        {getInitialsFromLabel(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e7e7e7',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
