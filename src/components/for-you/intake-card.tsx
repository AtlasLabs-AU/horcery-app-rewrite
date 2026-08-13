import { useState } from 'react';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { ChartPlaceholder } from '@/components/for-you/chart-placeholder';
import { SegmentedControl } from '@/components/for-you/segmented-control';

export type IntakeScope = 'stall' | 'horse';

const SCOPE_OPTIONS: { label: string; value: IntakeScope }[] = [
  { label: 'Stall', value: 'stall' },
  { label: 'Horse', value: 'horse' },
];

/**
 * Water Intake and Feed Intake share one shape: title, Stall/Horse segmented
 * control, chart, and an Average/Today legend. Only the title and the "Today"
 * colour differ, so they are one component.
 *
 * Chart is stubbed pending the charting-library decision.
 */
export function IntakeCard({
  title,
  todayColor,
  testID,
}: {
  title: string;
  /** Legend colour for today's series — blue for water, amber for feed. */
  todayColor: string;
  testID?: string;
}) {
  const [scope, setScope] = useState<IntakeScope>('stall');

  return (
    <SectionCard testID={testID}>
      <SectionHeader
        title={title}
        action={
          <SegmentedControl
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={setScope}
            width={132}
            testID={`${testID}-scope`}
          />
        }
      />
      <ChartPlaceholder
        height={128}
        legend={[
          { label: 'Average', color: '#B0B4BA' },
          { label: 'Today', color: todayColor },
        ]}
        testID={`${testID}-chart`}
      />
    </SectionCard>
  );
}
