import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
import { OrganizationMenu } from '@/components/for-you/organization-menu';
import { Brand, Fyp, Radius, Spacing } from '@/constants/theme';

export interface OrganizationCardProps {
  organizationName: string;
  /** Organizations available in the Switch menu. */
  organizations: { id: string; name: string }[];
  organizationID?: string | null;
  onSelectOrganization: (id: string) => void;
  /** Local time in the organization's timezone, pre-formatted ("10:29 am"). */
  localTime: string;
  temperature?: string;
  humidity?: string;
  /** Headline status from the AI summary. */
  statusText: string;
  /** How many metrics the AI is watching; hides the banner when undefined. */
  metricsWatched?: number;
  onManageOrganization?: () => void;
  onSeeHistory?: () => void;
  onManageAlerts?: () => void;
}

/**
 * Organization summary — name, local conditions, and the Horcery AI status.
 * Layout mirrors the current app exactly: title row, metric row, hairline,
 * AI row, status line, tinted banner.
 */
export function OrganizationCard({
  organizationName,
  organizations,
  organizationID,
  onSelectOrganization,
  localTime,
  temperature,
  humidity,
  statusText,
  metricsWatched,
  onManageOrganization,
  onSeeHistory,
  onManageAlerts,
}: OrganizationCardProps) {
  return (
    <SectionCard testID="for-you-organization-card">
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.orgName} numberOfLines={1}>
            {organizationName}
          </Text>
          <Pressable
            onPress={onManageOrganization}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Manage organization">
            <SymbolView
              name="gearshape.fill"
              size={16}
              tintColor={Brand.primary}
            />
          </Pressable>
        </View>
        <OrganizationMenu
          organizations={organizations}
          selectedId={organizationID}
          onSelect={onSelectOrganization}
          testID="for-you-switch-organization"
        />
      </View>

      <View style={styles.metricRow}>
        <Metric symbol="clock" value={localTime} />
        {temperature ? (
          <Metric symbol="thermometer.medium" value={temperature} />
        ) : null}
        {humidity ? <Metric symbol="drop" value={humidity} /> : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.titleRow}>
        <Text style={styles.aiHeading}>Horcery AI</Text>
        <LinkButton
          label="See History"
          width={110}
          onPress={onSeeHistory}
          testID="for-you-ai-history"
        />
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {metricsWatched === undefined ? null : (
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <SymbolView name="sparkles" size={16} tintColor={Brand.primary} />
            <Text style={styles.bannerText} numberOfLines={1}>
              {`AI watching ${metricsWatched} metrics`}
            </Text>
          </View>
          <LinkButton
            label="Manage Alerts"
            width={122}
            onPress={onManageAlerts}
            testID="for-you-manage-alerts"
          />
        </View>
      )}
    </SectionCard>
  );
}

function Metric({ symbol, value }: { symbol: string; value: string }) {
  return (
    <View style={styles.metric}>
      <SymbolView
        name={symbol as never}
        size={15}
        tintColor={Fyp.muted}
        resizeMode="scaleAspectFit"
      />
      <Text style={styles.metricText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  orgName: {
    fontSize: 21,
    fontWeight: '700',
    color: Fyp.title,
    flexShrink: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  metricText: {
    fontSize: 15,
    color: Fyp.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Fyp.divider,
    marginVertical: Spacing.three,
  },
  aiHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: Fyp.title,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Fyp.statusOk,
  },
  statusText: {
    fontSize: 16,
    color: Fyp.title,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Fyp.infoBackground,
    borderRadius: Radius.inner,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  bannerText: {
    fontSize: 15,
    color: Fyp.body,
    flexShrink: 1,
  },
});
