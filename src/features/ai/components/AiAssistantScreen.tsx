import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { useVendorStore } from '@/stores/vendorStore';
import { AI_HUB_ENABLED } from '../constants';
import {
  AiHubMode,
  AiHubNavigatePayload,
  MarketingTemplateId,
  SalesFocusId,
} from '../types';
import { AiHubHome } from './AiHubHome';
import { HelpTipsPanel } from './HelpTipsPanel';
import { MarketingPanel } from './MarketingPanel';
import { SalesAnalystCards } from './SalesAnalystPanel';

const MODE_TITLE: Record<Exclude<AiHubMode, 'home'>, string> = {
  marketing: 'Marketing',
  sales: 'Sales Analyst',
  help: 'Help & tips',
};

/**
 * Free AI Hub only: guided home → Marketing | Sales Analyst | Help.
 * Entry: floating button. No OpenAI chat. Reports / Bookings stay AI-free.
 */
export function AiAssistantScreen() {
  const vendor = useVendorStore((s) => s.vendor);
  const aiEnabled = vendor?.ai_enabled !== false;

  const [mode, setMode] = useState<AiHubMode>('home');
  const [marketingTemplate, setMarketingTemplate] = useState<
    MarketingTemplateId | undefined
  >();
  const [salesFocus, setSalesFocus] = useState<SalesFocusId | undefined>();

  const goHome = useCallback(() => {
    setMode('home');
    setMarketingTemplate(undefined);
    setSalesFocus(undefined);
  }, []);

  const handleNavigate = useCallback((payload: AiHubNavigatePayload) => {
    setMarketingTemplate(payload.marketingTemplate);
    setSalesFocus(payload.salesFocus);
    setMode(payload.mode);
  }, []);

  // AI Hub temporarily disabled — re-enable by setting AI_HUB_ENABLED = true
  if (!AI_HUB_ENABLED) {
    return (
      <ScreenContainer title="AI Hub">
        <EmptyState
          message="AI Hub is temporarily unavailable."
          icon="robot-off-outline"
        />
      </ScreenContainer>
    );
  }

  if (!vendor) {
    return (
      <ScreenContainer title="AI Hub">
        <EmptyState message="Sign in with a stall account to use the AI Hub." />
      </ScreenContainer>
    );
  }

  if (!aiEnabled) {
    return (
      <ScreenContainer title="AI Hub">
        <EmptyState
          message="AI Hub is turned off. Enable it in Settings → AI Hub."
          icon="robot-off-outline"
        />
      </ScreenContainer>
    );
  }

  const title =
    mode === 'home'
      ? 'AI Hub (Free)'
      : MODE_TITLE[mode as Exclude<AiHubMode, 'home'>];

  return (
    <ScreenContainer
      title={title}
      showBack={mode !== 'home'}
      onBack={mode === 'home' ? undefined : goHome}
      actions={
        mode === 'home' ? null : (
          <Appbar.Action
            icon="home-variant-outline"
            onPress={goHome}
            accessibilityLabel="AI Hub home"
          />
        )
      }
    >
      {mode === 'home' ? <AiHubHome onNavigate={handleNavigate} /> : null}

      {mode === 'marketing' ? (
        <MarketingPanel initialTemplateId={marketingTemplate} />
      ) : null}

      {mode === 'sales' ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.salesPad}
          keyboardShouldPersistTaps="handled"
        >
          <SalesAnalystCards initialFocus={salesFocus} />
        </ScrollView>
      ) : null}

      {mode === 'help' ? <HelpTipsPanel /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  salesPad: { paddingBottom: 48 },
});
