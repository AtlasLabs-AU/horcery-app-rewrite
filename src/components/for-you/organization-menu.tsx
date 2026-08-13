import { Host } from '@expo/ui';
import { Button, Menu } from '@expo/ui/swift-ui';
import { foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';

import { Brand } from '@/constants/theme';

export interface OrganizationOption {
  id: string;
  name: string;
}

/**
 * "Switch" — picks the organization to view.
 *
 * The current app opens a full screen for this. Here it is a native dropdown
 * anchored to the button, with a checkmark on the current organization. For a
 * list this short, a screen transition is more ceremony than the choice
 * deserves.
 */
export function OrganizationMenu({
  organizations,
  selectedId,
  onSelect,
  testID,
}: {
  organizations: OrganizationOption[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  testID?: string;
}) {
  return (
    <Host style={{ width: 76, height: 28 }} testID={testID}>
      <Menu
        label="Switch"
        modifiers={[tint(Brand.primary), foregroundStyle(Brand.primary)]}>
        {organizations.map((organization) => (
          <Button
            key={organization.id}
            label={organization.name}
            systemImage={
              organization.id === selectedId ? 'checkmark' : undefined
            }
            onPress={() => onSelect(organization.id)}
          />
        ))}
      </Menu>
    </Host>
  );
}
