import { render } from '@testing-library/react-native';

import { HorseCard } from '@/components/horses/horse-card';
import type { HorseRow } from '@/hooks/use-horses';

const horse: HorseRow = {
  id: 'horse-1',
  name: 'Storm',
  stallName: 'Stall 1',
  imageKind: 'none',
};

describe('HorseCard', () => {
  it('shows only the agreed list facts: name and stall', async () => {
    const view = await render(<HorseCard horse={horse} onPress={jest.fn()} />);

    expect(view.getByText('Storm')).toBeTruthy();
    expect(view.getByText('Stall 1')).toBeTruthy();
    expect(view.queryByText(/\b(In|Out)\b/)).toBeNull();
  });

  it('says No stall rather than leaving an unexplained blank', async () => {
    const view = await render(<HorseCard horse={{ ...horse, stallName: undefined }} />);

    expect(view.getByText('No stall')).toBeTruthy();
  });

  it('is a button only when card navigation is wired', async () => {
    const inactive = await render(<HorseCard horse={horse} />);
    expect(inactive.getByTestId('horse-card-horse-1').props.accessibilityRole).toBeUndefined();

    const active = await render(<HorseCard horse={horse} onPress={jest.fn()} />);
    expect(active.getByTestId('horse-card-horse-1').props.accessibilityRole).toBe('button');
  });
});
