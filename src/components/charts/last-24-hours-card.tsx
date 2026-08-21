import { StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/charts/lying-down';
import type { Last24Hours } from '@/charts/last-24-hours';
import { useTokens } from '@/hooks/use-tokens';
import type { TokenColors } from '@/constants/tokens';

/**
 * Last 24 Hours — Option B (Inakshi, 2026-08-21): one flat band whose segments
 * visibly make one whole, with the exact durations listed beneath it.
 *
 * The band and the list are drawn from the SAME model values, so they cannot
 * disagree — the shipping app's donut showed one total in its centre and a
 * different sum in its progress bars, and that gap is the bug this layout
 * replaces. There is deliberately nowhere on this card to print a second,
 * independently-computed total.
 *
 * Unknown time is a first-class segment: hollow with a dashed edge, visibly
 * different from every measured category, with a floor width so twelve missing
 * minutes cannot round away to nothing. Hiding the unknown is how missing data
 * becomes a confident claim.
 */

/** Colour per contract category. A new category must be added here knowingly. */
function segmentColor(id: string, colors: TokenColors): string {
  switch (id) {
    case 'resting':
      return colors.chartData;
    case 'rem':
      // Darker than resting when it arrives; reuses reference ink for now so
      // the future fixture renders distinguishably without a new token.
      return colors.chartReference;
    case 'in-stall-awake':
      return colors.chartDataSoft;
    default:
      return colors.chartTrack;
  }
}

const BAND_HEIGHT = 18;
/** Twelve missing minutes must stay visible on a 24-hour band. */
const MIN_SEGMENT_WIDTH = 3;

export function Last24HoursCard({ data, width }: { data: Last24Hours; width: number }) {
  const { colors, type, space, radius } = useTokens();

  if (data.state !== 'ready') {
    const message =
      data.state === 'loading'
        ? 'Loading…'
        : data.state === 'no-data'
          ? 'No readings for this period'
          : // Overflow or a negative duration: an upstream calculation error.
            "These readings don't add up, so we're not showing them";
    return (
      <View testID="last-24-hours" style={{ width }}>
        <Header windowLabel={data.windowLabel} />
        <View
          testID={`last-24-hours-${data.state}`}
          style={[styles.stateBed, { backgroundColor: colors.bed, borderRadius: radius.sm, padding: space.md, marginTop: space.md }]}>
          <Text style={[type.caption, { color: colors.secondary }]}>{message}</Text>
        </View>
      </View>
    );
  }

  const unknownShare = data.unknownSeconds / (24 * 3600);
  const rows = [
    ...data.segments,
    ...(data.unknownSeconds > 0
      ? [{ id: 'unknown', label: 'Not observed', seconds: data.unknownSeconds, share: unknownShare }]
      : []),
  ];

  return (
    <View testID="last-24-hours" style={{ width }}>
      <Header windowLabel={data.windowLabel} />

      <View style={[styles.band, { marginTop: space.md, borderRadius: BAND_HEIGHT / 2 }]}>
        {rows.map((segment) =>
          segment.seconds === 0 ? null : (
            <View
              key={segment.id}
              testID={`last-24-hours-segment-${segment.id}`}
              style={[
                {
                  flexGrow: segment.share,
                  flexBasis: 0,
                  minWidth: MIN_SEGMENT_WIDTH,
                  height: BAND_HEIGHT,
                },
                segment.id === 'unknown'
                  ? {
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: colors.chartReference,
                      borderRadius: 4,
                    }
                  : { backgroundColor: segmentColor(segment.id, colors) },
              ]}
            />
          ),
        )}
      </View>

      <View style={{ marginTop: space.md }}>
        {rows.map((segment) => (
          <View key={segment.id} style={[styles.row, { paddingVertical: space.xs }]}>
            <View
              style={[
                styles.swatch,
                segment.id === 'unknown'
                  ? { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.chartReference }
                  : { backgroundColor: segmentColor(segment.id, colors) },
              ]}
            />
            <Text style={[type.caption, styles.rowLabel, { color: colors.secondary }]}>
              {segment.label}
            </Text>
            <Text style={[type.caption, { color: colors.foreground, fontVariant: ['tabular-nums'] }]}>
              {formatDuration(segment.seconds)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Header({ windowLabel }: { windowLabel: string }) {
  const { colors, type } = useTokens();
  return (
    <View>
      <Text style={[type.headline, { color: colors.foreground }]}>Last 24 hours</Text>
      <Text style={[type.micro, { color: colors.tertiary, marginTop: 2 }]}>{windowLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', overflow: 'hidden', columnGap: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { flex: 1 },
  swatch: { width: 10, height: 10, borderRadius: 3, marginRight: 8 },
  stateBed: {},
});
