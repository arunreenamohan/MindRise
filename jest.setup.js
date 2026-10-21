/* eslint-env jest */

jest.mock('react-native-screens', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    enableScreens: jest.fn(),
    enableFreeze: jest.fn(),
    screensEnabled: jest.fn(() => false),
    freezeEnabled: jest.fn(() => false),
    Screen: View,
    InnerScreen: View,
    ScreenContext: React.createContext(),
    ScreenStackHeaderConfig: View,
    ScreenStackHeaderSubview: View,
    ScreenStackHeaderLeftView: View,
    ScreenStackHeaderCenterView: View,
    ScreenStackHeaderRightView: View,
    ScreenStackHeaderBackButtonImage: View,
    ScreenStackHeaderSearchBarView: View,
    SearchBar: View,
    ScreenContainer: View,
    ScreenStack: View,
    ScreenStackItem: View,
    FullWindowOverlay: View,
    ScreenFooter: View,
    ScreenContentWrapper: View,
    isSearchBarAvailableForCurrentPlatform: jest.fn(() => false),
    executeNativeBackPress: jest.fn(),
    useTransitionProgress: jest.fn(),
    compatibilityFlags: {
      usesNewAndroidHeaderHeightImplementation: false,
    },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock').default;
  return {
    __esModule: true,
    ...mock,
    default: mock,
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const SvgMock = (props) => React.createElement('Svg', props, props.children);
  return {
    __esModule: true,
    default: SvgMock,
    Svg: SvgMock,
    Path: (props) => React.createElement('Path', props),
    Rect: (props) => React.createElement('Rect', props),
    Circle: (props) => React.createElement('Circle', props),
    Polyline: (props) => React.createElement('Polyline', props),
    Polygon: (props) => React.createElement('Polygon', props),
    Line: (props) => React.createElement('Line', props),
    G: (props) => React.createElement('G', props, props.children),
  };
});
