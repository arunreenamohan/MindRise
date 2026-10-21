import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AppTabNavigator } from './AppTabNavigator';
import { GameIntroScreen } from '../screens/GameIntroScreen';
import { MemoryMatrixGameScreen } from '../screens/MemoryMatrixGameScreen';
import { NumberRecallGameScreen } from '../screens/NumberRecallGameScreen';
import { QuickReactionGameScreen } from '../screens/QuickReactionGameScreen';
import { LogicQuestGameScreen } from '../screens/LogicQuestGameScreen';
import { FocusFinderGameScreen } from '../screens/FocusFinderGameScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={AppTabNavigator} />
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
    </Stack.Navigator>
  );
};
