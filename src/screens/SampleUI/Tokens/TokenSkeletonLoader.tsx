import React from 'react';
import { View, Animated } from 'react-native';
import styles from './TokenFeedScreenStyles';

interface TokenSkeletonLoaderProps {
  pulseAnim: Animated.Value;
}

const TokenSkeletonLoader: React.FC<TokenSkeletonLoaderProps> = ({ pulseAnim }) => {
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <Animated.View style={[styles.skeletonContainer, { opacity }]}>
      <View style={styles.skeletonLeft}>
        <View style={styles.skeletonRank} />
        <View style={styles.skeletonLogo} />
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonSymbol} />
        <View style={styles.skeletonName} />
      </View>
      <View style={styles.skeletonRight}>
        <View style={styles.skeletonPrice} />
        <View style={styles.skeletonChange} />
        <View style={styles.skeletonButton} />
      </View>
    </Animated.View>
  );
};

export default TokenSkeletonLoader; 