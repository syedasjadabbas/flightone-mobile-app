import { useState } from "react";
import { Animated } from "react-native";

/**
 * One stable Animated.Value for the life of the component.
 * (React Native's own `useAnimatedValue` isn't in react-native-web, which the browser preview uses.)
 */
export function useAnimValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
