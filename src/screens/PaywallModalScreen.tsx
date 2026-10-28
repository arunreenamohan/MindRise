import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { useLocalization } from '../localization/LocalizationContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatBadge } from '../components/StatBadge';
import {
  XIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon,
  CrownIcon,
} from '../components/SvgIcons';
import { entitlementService } from '../services/EntitlementService';
import {
  MINDRISE_SKUS,
  type ProductSku,
  type PurchasePlan,
  type EntitlementState,
} from '../types/iap';

type PaywallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PaywallModal'>;

export const PaywallModalScreen: React.FC = () => {
  const navigation = useNavigation<PaywallNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const { t } = useLocalization();

  const [plans, setPlans] = useState<PurchasePlan[]>([]);
  const [selectedSku, setSelectedSku] = useState<ProductSku>(MINDRISE_SKUS.ANNUAL);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [entitlementState, setEntitlementState] = useState<EntitlementState>(
    entitlementService.getEntitlementStateSync()
  );

  // Load plans & subscribe to entitlement changes
  useEffect(() => {
    let isMounted = true;

    // Subscribe to entitlement state updates
    const unsubscribe = entitlementService.subscribe((state) => {
      if (isMounted) {
        setEntitlementState(state);
      }
    });

    // Fetch store pricing or fallback plans
    entitlementService
      .getAvailablePlans()
      .then((loadedPlans) => {
        if (isMounted) {
          setPlans(loadedPlans);
          setIsLoadingPlans(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPlans(entitlementService.getDefaultPlans());
          setIsLoadingPlans(false);
        }
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSelectPlan = (sku: ProductSku) => {
    if (isProcessing || isRestoring) return;
    setSelectedSku(sku);
  };

  const handlePurchase = async () => {
    if (isProcessing || isRestoring) return;

    if (entitlementState.isPro) {
      Alert.alert(t.paywall.title, t.paywall.alreadyPro, [{ text: t.common.close }]);
      return;
    }

    setIsProcessing(true);
    try {
      await entitlementService.purchasePlan(selectedSku);
      // Native flow takes over. Upon completion, purchaseUpdatedListener triggers state update
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.paywall.purchaseErrorMessage;
      Alert.alert(t.paywall.purchaseErrorTitle, msg, [{ text: t.common.close }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (isProcessing || isRestoring) return;

    setIsRestoring(true);
    try {
      const result = await entitlementService.restorePurchases();
      if (result.success && result.isPro) {
        Alert.alert(
          t.paywall.restoreSuccessTitle,
          t.paywall.restoreSuccessMessage,
          [{ text: t.common.close }]
        );
      } else {
        Alert.alert(
          t.paywall.restoreNotFoundTitle,
          t.paywall.restoreNotFoundMessage,
          [{ text: t.common.close }]
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.paywall.purchaseErrorMessage;
      Alert.alert(t.paywall.purchaseErrorTitle, msg, [{ text: t.common.close }]);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenTerms = async () => {
    const url = 'https://mindrise.app/terms';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Fallback
    }
  };

  const handleOpenPrivacy = async () => {
    const url = 'https://mindrise.app/privacy';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Fallback
    }
  };

  const features = [
    {
      title: t.paywall.featureUnlimitedDrillsTitle,
      desc: t.paywall.featureUnlimitedDrillsDesc,
    },
    {
      title: t.paywall.featureMaxDifficultyTitle,
      desc: t.paywall.featureMaxDifficultyDesc,
    },
    {
      title: t.paywall.featureFullAnalyticsTitle,
      desc: t.paywall.featureFullAnalyticsDesc,
    },
    {
      title: t.paywall.featureDataExportTitle,
      desc: t.paywall.featureDataExportDesc,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <CrownIcon size={24} color={colors.primaryLight} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginLeft: 10 }]}>
            {t.paywall.title}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          style={[styles.closeButton, { backgroundColor: colors.backgroundElevated }]}
          accessibilityLabel={t.paywall.closeAriaLabel}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <XIcon size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Tagline Card */}
        <Card variant="highlighted" style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <StatBadge
              label="PRO UPGRADE"
              variant="primary"
              size="sm"
              icon={<SparklesIcon size={12} color={colors.primaryLight} />}
            />
            {entitlementState.isPro && (
              <StatBadge
                label="ACTIVE MEMBER"
                variant="success"
                size="sm"
                icon={<ShieldCheckIcon size={12} color="#10B981" />}
              />
            )}
          </View>
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 10 }]}>
            {t.paywall.title}
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 4 }]}>
            {t.paywall.subtitle}
          </Text>
        </Card>

        {/* Benefits Comparison List */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {t.paywall.featuresTitle}
          </Text>
        </View>

        <View style={styles.featuresList}>
          {features.map((feature, idx) => (
            <View key={idx} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <CheckIcon size={16} color="#10B981" />
              </View>
              <View style={styles.featureTextCol}>
                <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {feature.title}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {feature.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tier Selector Section */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>
            {t.paywall.plansTitle}
          </Text>
        </View>

        {isLoadingPlans ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
          </View>
        ) : (
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isSelected = selectedSku === plan.sku;
              const isAnnual = plan.sku === MINDRISE_SKUS.ANNUAL;

              let planTitle = t.paywall.annualTitle;
              let planSubtitle = t.paywall.annualPeriod;
              if (plan.sku === MINDRISE_SKUS.MONTHLY) {
                planTitle = t.paywall.monthlyTitle;
                planSubtitle = t.paywall.monthlyPeriod;
              } else if (plan.sku === MINDRISE_SKUS.LIFETIME) {
                planTitle = t.paywall.lifetimeTitle;
                planSubtitle = t.paywall.lifetimePeriod;
              }

              return (
                <TouchableOpacity
                  key={plan.sku}
                  onPress={() => handleSelectPlan(plan.sku)}
                  activeOpacity={0.8}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected ? 'rgba(124, 92, 252, 0.12)' : colors.backgroundElevated,
                      borderColor: isSelected ? colors.primaryLight : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.planCardTop}>
                    <View style={styles.planTitleGroup}>
                      <View style={styles.planRadioRow}>
                        <View
                          style={[
                            styles.radioOuter,
                            { borderColor: isSelected ? colors.primaryLight : colors.textMuted },
                          ]}
                        >
                          {isSelected && (
                            <View style={[styles.radioInner, { backgroundColor: colors.primaryLight }]} />
                          )}
                        </View>
                        <Text style={[typography.h3, { color: colors.textPrimary, marginLeft: 10 }]}>
                          {planTitle}
                        </Text>
                      </View>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, marginLeft: 26 }]}>
                        {planSubtitle}
                      </Text>
                    </View>

                    <View style={styles.planPriceGroup}>
                      <Text style={[typography.h2, { color: colors.textPrimary }]}>
                        {plan.localizedPrice || `$${plan.price}`}
                      </Text>
                    </View>
                  </View>

                  {/* Badges for Annual Best Value */}
                  {isAnnual && (
                    <View style={styles.badgeRow}>
                      <StatBadge
                        label={t.paywall.bestValueBadge}
                        variant="primary"
                        size="sm"
                        icon={<SparklesIcon size={12} color={colors.primaryLight} />}
                      />
                      <StatBadge
                        label={t.paywall.saveBadge}
                        variant="success"
                        size="sm"
                        style={styles.saveBadgeMargin}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Primary CTA Upgrade Button */}
        <View style={styles.ctaContainer}>
          <Button
            title={
              isProcessing
                ? t.paywall.processing
                : entitlementState.isPro
                ? t.paywall.alreadyPro
                : selectedSku === MINDRISE_SKUS.LIFETIME
                ? t.paywall.lifetimeCta
                : t.paywall.subscribeCta
            }
            onPress={handlePurchase}
            variant="primary"
            size="lg"
            disabled={isProcessing || isRestoring || entitlementState.isPro}
            icon={isProcessing ? undefined : <ZapIcon size={18} color="#FFFFFF" />}
          />
        </View>

        {/* Restore Purchases Button */}
        <View style={styles.restoreRow}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={isRestoring || isProcessing}
            activeOpacity={0.7}
            style={styles.restoreButton}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.primaryLight} />
            ) : (
              <Text style={[typography.label, { color: colors.primaryLight }]}>
                {t.paywall.restorePurchases}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Legal Footer Links (Google Play / App Store compliant) */}
        <View style={styles.legalFooter}>
          <TouchableOpacity onPress={handleOpenTerms} activeOpacity={0.7}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.paywall.termsOfService}
            </Text>
          </TouchableOpacity>
          <Text style={[typography.caption, { color: colors.textMuted, marginHorizontal: 8 }]}>
            •
          </Text>
          <TouchableOpacity onPress={handleOpenPrivacy} activeOpacity={0.7}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {t.paywall.privacyPolicy}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroCard: {
    marginBottom: 20,
    padding: 18,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
  },
  featuresList: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  featureIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextCol: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleGroup: {
    flex: 1,
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planPriceGroup: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 26,
  },
  saveBadgeMargin: {
    marginLeft: 6,
  },
  ctaContainer: {
    marginTop: 10,
    marginBottom: 12,
  },
  restoreRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});
