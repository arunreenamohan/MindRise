import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AppTabNavigator } from './AppTabNavigator';
import { DailyWorkoutScreen } from '../screens/DailyWorkoutScreen';
import { GameIntroScreen } from '../screens/GameIntroScreen';
import { MemoryMatrixGameScreen } from '../screens/MemoryMatrixGameScreen';
import { NumberRecallGameScreen } from '../screens/NumberRecallGameScreen';
import { QuickReactionGameScreen } from '../screens/QuickReactionGameScreen';
import { LogicQuestGameScreen } from '../screens/LogicQuestGameScreen';
import { FocusFinderGameScreen } from '../screens/FocusFinderGameScreen';
import { PatternMasterGameScreen } from '../screens/PatternMasterGameScreen';
import { useTheme } from '../theme/ThemeContext';
import { hasCompletedOnboarding } from '../storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    hasCompletedOnboarding()
      .then((completed) => {
        if (isMounted) {
          setIsOnboardingCompleted(completed);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsOnboardingCompleted(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isOnboardingCompleted === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isOnboardingCompleted ? 'MainTabs' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={AppTabNavigator} />
      <Stack.Screen
        name="DailyWorkout"
        component={DailyWorkoutScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="GameIntro"
        component={GameIntroScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="MemoryMatrixGame"
        component={MemoryMatrixGameScreen}
        options={{
          presentation: 'card',
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="NumberRecallGame"
        component={NumberRecallGameScreen}
        options={{
          presentation: 'card',
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="QuickReactionGame"
        component={QuickReactionGameScreen}
        options={{
          presentation: 'card',
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="LogicQuestGame"
        component={LogicQuestGameScreen}
        options={{
          presentation: 'card',
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="FocusFinderGame"
        component={FocusFinderGameScreen}
        options={{
          presentation: 'card',
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="PatternMasterGame"
        component={PatternMasterGameScreen}
        options={{
          presentation: 'card',
          animation: 'fade_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
