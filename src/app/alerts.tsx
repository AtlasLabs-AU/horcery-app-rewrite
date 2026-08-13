import { Host, Slider } from '@expo/ui';
import {
  Button as SwiftUIButton,
  DatePicker,
  Picker as SwiftUIPicker,
  Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  frame,
  pickerStyle,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { GlassView } from 'expo-glass-effect';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Demo — the current app's "Configure Alert" screen (Lying Down Time),
 * SAME layout, with each hand-rolled control swapped for its @expo/ui
 * native counterpart, plus iOS 26 liquid glass on the summary card and
 * the Apply button:
 *
 *   segmented rows  (controlled-segmented-buttons, styled gluestack Buttons)
 *                   → SwiftUI Picker with pickerStyle('segmented')
 *   time slider     (~200-line custom gesture-handler slider)
 *                   → @expo/ui Slider (universal)
 *   From/To fields  (react-native-date-picker modal)
 *                   → SwiftUI DatePicker (hourAndMinute, inline compact)
 *   Apply button    (gluestack Button)
 *                   → SwiftUI Button with buttonStyle('glassProminent')
 *
 * This screen uses @expo/ui/swift-ui directly, so it is iOS-only as
 * written; per the rewrite requirements the Android build gets the
 * jetpack-compose counterparts behind the shared surface layer.
 */

const TIME_OPTIONS = [15, 30, 45, 60, 90];

const palette = {
  background: '#F8F9FB',
  card: '#FFFFFF',
  title: '#3F4A5F',
  label: '#252B37',
  body: '#4B5565',
  chipBg: '#EEF0F5',
  track: '#E4E7EE',
};

export default function ConfigureAlertDemoScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const [basedOn, setBasedOn] = useState('combined');
  const [condition, setCondition] = useState('more_than');
  const [timeIndex, setTimeIndex] = useState(1); // 30 mins
  const [alertActive, setAlertActive] = useState('custom');
  const [fromTime, setFromTime] = useState(() => new Date(2026, 0, 1, 17, 0));
  const [toTime, setToTime] = useState(() => new Date(2026, 0, 1, 23, 30));

  const minutes = TIME_OPTIONS[timeIndex];
  const timeWindow = alertActive === 'custom'
    ? `between ${formatTime(fromTime)} and ${formatTime(toTime)}`
    : 'at any time';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.headerRow}>
            <Text style={styles.headerBack}>←</Text>
            <Text style={styles.headerTitle}>Configure Alert</Text>
          </View>
          <Text style={styles.stepLabel}>2/2</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBar} />
            <View style={styles.progressBar} />
          </View>

          <GlassView glassEffectStyle="regular" style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>🐴 Lying Down Time</Text>
            <Text style={styles.summaryBody}>
              {`You will be notified if your horses lie down for a total of ${
                condition === 'more_than' ? 'more' : 'less'
              } than ${minutes} min ${timeWindow}`}
            </Text>
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>🏠 All Stalls</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>🔔 Everyone</Text>
              </View>
            </View>
          </GlassView>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Alert Details</Text>

            <Text style={styles.fieldLabel}>Measure Lying Down Time Based On</Text>
            <Host style={styles.segmentedHost}>
              <SwiftUIPicker
                selection={basedOn}
                onSelectionChange={(v) => setBasedOn(String(v))}
                modifiers={[pickerStyle('segmented'), frame({ maxWidth: Infinity })]}>
                <SwiftUIText modifiers={[tag('combined')]}>Combined</SwiftUIText>
                <SwiftUIText modifiers={[tag('continuous')]}>Continuous</SwiftUIText>
              </SwiftUIPicker>
            </Host>

            <Text style={styles.fieldLabel}>Send Alert If</Text>
            <Host style={styles.segmentedHost}>
              <SwiftUIPicker
                selection={condition}
                onSelectionChange={(v) => setCondition(String(v))}
                modifiers={[pickerStyle('segmented'), frame({ maxWidth: Infinity })]}>
                <SwiftUIText modifiers={[tag('less_than')]}>Less than</SwiftUIText>
                <SwiftUIText modifiers={[tag('more_than')]}>More than</SwiftUIText>
              </SwiftUIPicker>
            </Host>

            <View style={styles.timeHeaderRow}>
              <Text style={styles.fieldLabel}>Time (mins)</Text>
              <Text style={styles.linkText}>Set Custom Value</Text>
            </View>
            <Host style={styles.sliderHost}>
              <Slider
                value={timeIndex}
                onValueChange={setTimeIndex}
                min={0}
                max={TIME_OPTIONS.length - 1}
                step={1}
                testID="time-slider"
              />
            </Host>
            <View style={styles.sliderLabels}>
              {TIME_OPTIONS.map((option, index) => (
                <Text
                  key={option}
                  style={[
                    styles.sliderLabel,
                    index === timeIndex && styles.sliderLabelActive,
                  ]}>
                  {option}
                </Text>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Alert Active</Text>
            <Host style={styles.segmentedHost}>
              <SwiftUIPicker
                selection={alertActive}
                onSelectionChange={(v) => setAlertActive(String(v))}
                modifiers={[pickerStyle('segmented'), frame({ maxWidth: Infinity })]}>
                <SwiftUIText modifiers={[tag('any_time')]}>Any Time</SwiftUIText>
                <SwiftUIText modifiers={[tag('custom')]}>Custom</SwiftUIText>
              </SwiftUIPicker>
            </Host>

            {alertActive === 'custom' && (
              <View style={styles.timeFieldRow}>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>From</Text>
                  <Host matchContents>
                    <DatePicker
                      selection={fromTime}
                      onDateChange={setFromTime}
                      displayedComponents={['hourAndMinute']}
                    />
                  </Host>
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>To</Text>
                  <Host matchContents>
                    <DatePicker
                      selection={toTime}
                      onDateChange={setToTime}
                      displayedComponents={['hourAndMinute']}
                    />
                  </Host>
                </View>
              </View>
            )}
          </View>

          <View style={styles.rowCard}>
            <View>
              <Text style={styles.rowCardTitle}>Apply To</Text>
              <Text style={styles.rowCardValue}>All Stalls</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.rowCard}>
            <View>
              <Text style={styles.rowCardTitle}>Send Alert To</Text>
              <Text style={styles.rowCardValue}>Everyone</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>

          <Host style={styles.applyHost}>
            <SwiftUIButton
              onPress={() => {}}
              modifiers={[buttonStyle('glassProminent'), tint(Brand.primary)]}>
              <SwiftUIText modifiers={[frame({ width: contentWidth - Spacing.three * 2, height: 28 })]}>
                Apply
              </SwiftUIText>
            </SwiftUIButton>
          </Host>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  headerBack: {
    fontSize: 24,
    color: palette.title,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.title,
  },
  stepLabel: {
    alignSelf: 'flex-end',
    color: palette.body,
    fontSize: 13,
    marginTop: Spacing.one,
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },
  summaryCard: {
    marginTop: Spacing.three,
    borderRadius: 12,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.label,
  },
  summaryBody: {
    marginTop: Spacing.two,
    fontSize: 14,
    lineHeight: 20,
    color: palette.body,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  chip: {
    backgroundColor: palette.chipBg,
    borderRadius: 12,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 12,
    color: palette.body,
  },
  card: {
    marginTop: Spacing.three,
    backgroundColor: palette.card,
    borderRadius: 12,
    padding: Spacing.three,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.label,
  },
  fieldLabel: {
    marginTop: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
    color: palette.label,
  },
  segmentedHost: {
    marginTop: Spacing.two,
    height: 32,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  linkText: {
    color: Brand.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  sliderHost: {
    marginTop: Spacing.two,
    height: 30,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
    paddingHorizontal: 2,
  },
  sliderLabel: {
    fontSize: 13,
    color: palette.body,
  },
  sliderLabelActive: {
    color: Brand.primary,
    fontWeight: '700',
  },
  timeFieldRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  timeField: {
    flex: 1,
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  rowCard: {
    marginTop: Spacing.three,
    backgroundColor: palette.card,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.label,
  },
  rowCardValue: {
    marginTop: 2,
    fontSize: 13,
    color: palette.body,
  },
  chevron: {
    fontSize: 24,
    color: Brand.primary,
  },
  applyHost: {
    marginTop: Spacing.four,
    height: 44,
  },
});
