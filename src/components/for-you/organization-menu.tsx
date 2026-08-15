import { Host } from '@expo/ui';
import { Button, Menu } from '@expo/ui/swift-ui';
import { foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export interface OrganizationOption {
  id: string;
  name: string;
}

/**
 * "Switch" — picks the organization to view.
 *
 * The current app opens a full screen for this. Here it is a native dropdown
 * anchored to the word, with a checkmark on the current organization. For a
 * list this short, a screen transition is more ceremony than the choice
 * deserves. Fixed Host box sized to the label so it aligns on the title line.
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
  const { colors } = useTokens();
  return (
    <Host style={styles.host} testID={testID}>
      <Menu
        label="Switch"
        modifiers={[tint(colors.accent), foregroundStyle(colors.accent)]}>
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

const styles = StyleSheet.create({
  host: {
    width: 64,
    height: 32,
  },
});
