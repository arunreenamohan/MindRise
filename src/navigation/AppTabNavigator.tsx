import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { TrainScreen } from '../screens/TrainScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { HomeIcon, DumbbellIcon, ChartIcon, UserIcon } from '../components/SvgIcons';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const AppTabNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLocalization();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t.navigation.home,
          tabBarIcon: ({ color, size }) => <HomeIcon size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Train"
        component={TrainScreen}
        options={{
          tabBarLabel: t.navigation.train,
          tabBarIcon: ({ color, size }) => <DumbbellIcon size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: t.navigation.progress,
          tabBarIcon: ({ color, size }) => <ChartIcon size={size || 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t.navigation.profile,
          tabBarIcon: ({ color, size }) => <UserIcon size={size || 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
