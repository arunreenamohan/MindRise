import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { LocalizationProvider } from '../src/localization/LocalizationContext';
import { PaywallModalScreen } from '../src/screens/PaywallModalScreen';
import { entitlementService } from '../src/services/EntitlementService';

describe('PaywallModalScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await entitlementService.resetEntitlementForTesting();
  });

  afterEach(async () => {
    await entitlementService.destroy();
  });

  const renderComponent = async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider>
          <ThemeProvider>
            <LocalizationProvider>
              <NavigationContainer>
                <PaywallModalScreen />
              </NavigationContainer>
            </LocalizationProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      );
    });
    return renderer!;
  };

  it('renders correctly with title, benefits, and tier cards', async () => {
    const renderer = await renderComponent();
    expect(renderer).toBeDefined();

    const root = renderer.root;
    // Check that title "MindRise Pro" is rendered
    const textNodes = root.findAllByType(Text);
    const texts = textNodes.map((n) => n.props.children).flat();

    expect(texts).toContain('MindRise Pro');
    expect(texts).toContain('PRO UPGRADE');
    expect(texts).toContain('Restore Purchases');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
