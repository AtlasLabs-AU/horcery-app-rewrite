import { fireEvent, render } from '@testing-library/react-native';

import {
  EventCard,
  type HistoryEvent,
} from '@/components/review-history/event-card';

const baseEvent: HistoryEvent = {
  id: 'event-1',
  title: 'Lying Down',
  startTime: '2026-08-15T22:32:00.000Z',
  timeLabel: '15 Aug 2026 11:32 PM',
  hasClip: true,
  durationLabel: '42m',
  animalName: 'Storm',
  stallName: 'Stall 2',
  isAlert: false,
  icon: 'lyingDown',
};

describe('EventCard footage controls', () => {
  it('never presents an inert play control when no stream exists', async () => {
    const withStill = await render(
      <EventCard event={{ ...baseEvent, blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' }} />,
    );

    const tile = withStill.getByTestId('history-event-event-1');
    expect(tile.props.accessibilityRole).toBeUndefined();
    expect(tile.props.accessibilityLabel).not.toContain('tap to play');

    const withoutVisual = await render(<EventCard event={baseEvent} />);
    expect(withoutVisual.getByText('Footage')).toBeTruthy();
    expect(withoutVisual.getByText('Unavailable')).toBeTruthy();
  });

  it('becomes a real video button only when a stream and handler are supplied', async () => {
    const onPress = jest.fn();
    const view = await render(
      <EventCard
        event={{
          ...baseEvent,
          posterUri: 'https://monitor.example/frame.jpeg',
          videoUri: 'https://api.example/recorded.m3u8',
        }}
        onPress={onPress}
      />,
    );

    const tile = view.getByTestId('history-event-event-1');
    expect(tile.props.accessibilityRole).toBe('button');
    expect(tile.props.accessibilityLabel).toContain('tap to play video');
    await fireEvent.press(tile);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('can open a timestamp even when the event has no footage', async () => {
    const onPress = jest.fn();
    const view = await render(
      <EventCard
        event={baseEvent}
        onPress={onPress}
        actionHint="tap to view this moment in Summary"
      />,
    );

    const card = view.getByTestId('history-event-event-1');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toContain('view this moment in Summary');
    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
