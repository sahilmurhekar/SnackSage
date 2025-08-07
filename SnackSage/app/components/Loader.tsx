// components/Loader.tsx
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

export default function Loader() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDot = (dot: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dot, {
          toValue: -10,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    animateDot(dot1, 0);
    animateDot(dot2, 100);
    animateDot(dot3, 200);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>

      <Image source={require('../assets/images/logo.png')} resizeMode="contain" style={{ width: 150, height: 150, marginBottom: 15 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', height: 10 }}>
        <Animated.View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: '#111111', marginHorizontal: 5, transform: [{ translateY: dot1 }] }} />
        <Animated.View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: '#111111', marginHorizontal: 5, transform: [{ translateY: dot2 }] }} />
        <Animated.View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: '#111111', marginHorizontal: 5, transform: [{ translateY: dot3 }] }} />
      </View>
    </View>
  );
}
