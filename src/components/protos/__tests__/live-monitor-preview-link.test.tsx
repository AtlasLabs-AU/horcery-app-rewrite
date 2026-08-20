import { render } from '@testing-library/react-native';

import { LiveMonitorPreviewLink } from '@/components/protos/live-monitor-preview-link';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/config/previews', () => ({ PREVIEWS: { liveMonitorPreview: false } }));

describe('LiveMonitorPreviewLink', () => {
  it('does not render when the dev-only live monitor flag is off', async () => {
    const view = await render(<LiveMonitorPreviewLink />);

    expect(view.queryByTestId('proto-live-charts-link')).toBeNull();
  });
});
