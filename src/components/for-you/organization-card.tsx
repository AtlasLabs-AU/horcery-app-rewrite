import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/for-you/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { LinkButton } from '@/components/for-you/link-button';
import { Menu } from '@/components/ui/menu';
import type { AlertStatus } from '@/hooks/use-alert-status';
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
  /** Derived health — see useAlertStatus. Never a hardcoded string. */
  alertStatus: AlertStatus;
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
  alertStatus,
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
            <Icon name="settings" size={16} color={colors.accent} />
          </Pressable>
        </View>
        <Menu
          label="Switch"
          accessibilityLabel="Switch organization"
          width={72}
          actions={organizations.map((organization) => ({
            id: organization.id,
            label: organization.name,
            selected: organization.id === organizationID,
            onPress: () => onSelectOrganization(organization.id),
          }))}
          testID="for-you-switch-organization"
        />
      </View>

      <View style={styles.metricRow}>
        <Metric icon="clock" value={localTime} />
        {temperature ? <Metric icon="temperature" value={temperature} /> : null}
        {humidity ? <Metric icon="humidity" value={humidity} /> : null}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.titleRow}>
        <Text style={[type.headline, { color: colors.foreground }]}>Horcery AI</Text>
        <LinkButton label="See History" onPress={onSeeHistory} testID="for-you-ai-history" />
      </View>

      <StatusLine status={alertStatus} />

      {alertStatus.kind === 'normal' || alertStatus.kind === 'active' ? (
        <View style={[styles.banner, { backgroundColor: colors.bed }]}>
          <View style={styles.bannerLeft}>
            <Icon name="ai" size={16} color={colors.accent} />
            <Text style={[type.subhead, styles.bannerText, { color: colors.secondary }]} numberOfLines={1}>
              {`AI watching ${alertStatus.rulesConfigured} ${alertStatus.rulesConfigured === 1 ? 'metric' : 'metrics'}`}
            </Text>
          </View>
          {onManageAlerts ? (
            <LinkButton label="Manage Alerts" onPress={onManageAlerts} testID="for-you-manage-alerts" />
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
}

/**
 * One line, five honest states. Loading shows a spinner, not a guess;
 * unavailable says so, in the alert colour, because in a monitoring app
 * "we can't tell" is itself something to notice.
 */
function StatusLine({ status }: { status: AlertStatus }) {
  const { colors } = useTokens();
  const dot = {
    loading: colors.dimmed,
    unavailable: colors.statusAlert,
    not_set: colors.dimmed,
    normal: colors.statusOk,
    active: colors.statusAlert,
  }[status.kind];
  const text = {
    loading: 'Checking alerts\u2026',
    unavailable: 'Alert status unavailable',
    not_set: 'No alerts set',
    normal: 'Everything looks normal',
    active:
      status.kind === 'active'
        ? `${status.count} active ${status.count === 1 ? 'alert' : 'alerts'}`
        : '',
  }[status.kind];

  return (
    <View style={styles.statusRow} testID={`for-you-alert-status-${status.kind}`}>
      {status.kind === 'loading' ? (
        <ActivityIndicator size="small" color={colors.tertiary} style={styles.statusSpinner} />
      ) : (
        <View style={[styles.statusDot, { backgroundColor: dot }]} />
      )}
      <Text style={[type.body, { color: status.kind === 'loading' ? colors.tertiary : colors.foreground }]}>
        {text}
      </Text>
    </View>
  );
}

function Metric({ icon, value }: { icon: IconName; value: string }) {
  const { colors } = useTokens();
  return (
    <View style={styles.metric}>
      <Icon name={icon} size={15} color={colors.tertiary} />
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
  statusSpinner: {
    width: 12,
    height: 12,
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
