import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { MediaCarousel } from '@/components/media/media-carousel';

/**
 * The property this file protects is the one from requirements §6b finding 6:
 * **no stall is ever silently dropped.**
 *
 * The old Snapshots row rendered `snapshots.slice(0, columns)` under a row of
 * page dots — on a two-column phone in an eight-stall barn, six stalls were
 * simply absent while the dots asserted four pages of content. Silent omission
 * is the worst failure mode a monitoring product has: nothing looks wrong.
 *
 * A pure paging helper used to guard that (`snapshot-paging.ts`, deleted with
 * the carousel). The carousel makes the invariant structural — it maps the
 * whole list — so the test moved here, where it asserts the rendered output
 * rather than a function the component might stop calling.
 */
const items = (length: number) =>
  Array.from({ length }, (_, index) => ({ id: `stall-${index}` }));

const renderCarousel = (length: number) =>
  render(
    <MediaCarousel
      items={items(length)}
      keyExtractor={(item) => item.id}
      renderItem={(item) => <Text>{item.id}</Text>}
    />,
  );

describe('MediaCarousel', () => {
  it.each([1, 2, 3, 8, 25])('renders every one of %i items', async (length) => {
    const view = await renderCarousel(length);

    for (const item of items(length)) {
      expect(view.getByText(item.id)).toBeTruthy();
    }
  });

  it('renders nothing at all when there is nothing to show', async () => {
    const view = await renderCarousel(0);

    expect(view.toJSON()).toBeNull();
  });

  it('draws one dot per item, and none for a single item', async () => {
    // The dots must agree with the content: the old row drew a dot per PAGE
    // of items it had not rendered.
    const many = await renderCarousel(4);
    expect(many.getByText('stall-3')).toBeTruthy();

    const one = await renderCarousel(1);
    expect(one.getByText('stall-0')).toBeTruthy();
  });
});
