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

jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  const mockStorage = {
    getItem: jest.fn(async (key) => store[key] ?? null),
    setItem: jest.fn(async (key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(async (key) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
    getAllKeys: jest.fn(async () => Object.keys(store)),
    multiGet: jest.fn(async (keys) => keys.map((k) => [k, store[k] ?? null])),
    multiSet: jest.fn(async (pairs) => {
      pairs.forEach(([k, v]) => {
        store[k] = String(v);
      });
    }),
    multiRemove: jest.fn(async (keys) => {
      keys.forEach((k) => {
        delete store[k];
      });
    }),
  };
  return {
    __esModule: true,
    default: mockStorage,
    ...mockStorage,
  };
});

jest.mock('react-native-iap', () => {
  return {
    __esModule: true,
    initConnection: jest.fn(async () => true),
    endConnection: jest.fn(async () => {}),
    fetchProducts: jest.fn(async () => []),
    getAvailablePurchases: jest.fn(async () => []),
    requestPurchase: jest.fn(async () => ({})),
    finishTransaction: jest.fn(async () => ({})),
    acknowledgePurchaseAndroid: jest.fn(async () => true),
    purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
    purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
    subscriptionBillingIssueListener: jest.fn(() => ({ remove: jest.fn() })),
    isNitroReady: jest.fn(() => true),
  };
});

