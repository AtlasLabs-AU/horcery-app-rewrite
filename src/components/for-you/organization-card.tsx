import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
import { OrganizationMenu } from '@/components/for-you/organization-menu';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

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
 * Layout mirrors the current app: title row, metric row, hairline, AI row,
 * status line, tinted banner. On tokens; every row keeps its action inline.
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
  const { colors } = useTokens();
  return (
    <SectionCard testID="for-you-organization-card">
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Text
            style={[type.title3, styles.orgName, { color: colors.foreground }]}
            numberOfLines={1}>
            {organizationName}
          </Text>
          <Pressable
            onPress={onManageOrganization}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Manage organization">
            <SymbolView name="gearshape.fill" size={16} tintColor={colors.accent} />
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
        {temperature ? <Metric symbol="thermometer.medium" value={temperature} /> : null}
        {humidity ? <Metric symbol="drop" value={humidity} /> : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.titleRow}>
        <Text style={[type.headline, { color: colors.foreground }]}>Horcery AI</Text>
        <LinkButton label="See History" onPress={onSeeHistory} testID="for-you-ai-history" />
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: colors.statusOk }]} />
        <Text style={[type.body, { color: colors.foreground }]}>{statusText}</Text>
      </View>

      {metricsWatched === undefined ? null : (
        <View style={[styles.banner, { backgroundColor: colors.bed }]}>
          <View style={styles.bannerLeft}>
            <SymbolView name="sparkles" size={16} tintColor={colors.accent} />
            <Text style={[type.subhead, styles.bannerText, { color: colors.secondary }]} numberOfLines={1}>
              {`AI watching ${metricsWatched} metrics`}
            </Text>
          </View>
          <LinkButton label="Manage Alerts" onPress={onManageAlerts} testID="for-you-manage-alerts" />
        </View>
      )}
    </SectionCard>
  );
}

function Metric({ symbol, value }: { symbol: string; value: string }) {
  const { colors } = useTokens();
  return (
    <View style={styles.metric}>
      <SymbolView
        name={symbol as never}
        size={15}
        tintColor={colors.tertiary}
        resizeMode="scaleAspectFit"
      />
      <Text style={[type.subhead, { color: colors.secondary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: 32,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  orgName: {
    flexShrink: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginTop: space.xs,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space.edge,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    paddingLeft: space.edge,
    paddingRight: space.sm,
    paddingVertical: space.sm,
    marginTop: space.edge,
    gap: space.sm,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  bannerText: {
    flexShrink: 1,
  },
});
