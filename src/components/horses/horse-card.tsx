import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { MediaTile } from '@/components/media/media-tile';
import { Icon } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import type { HorseRow } from '@/hooks/use-horses';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/** Thumbnail box: 4:3, the ratio Inakshi chose for every camera still. */
export const THUMB_WIDTH = 120;
export const THUMB_HEIGHT = 90;
/** Card height is fixed so the list can lay rows out without measuring. */
export const CARD_HEIGHT = THUMB_HEIGHT + space.sm * 2;

/**
 * One horse in the list: a still on the left, name and stall on the right,
 * an overflow menu in the corner. Name + stall only, by decision — no In/Out
 * pill (Inakshi, 2026-08-16); status lives on the horse's detail page.
 *
 * The still is a plain image (the stall's latest frame when there is a
 * monitor, otherwise the profile photo). The current app mounts a per-card
 * query chain and a live-frame refresh here; this card owns no data at all.
 *
 * The overflow actions mirror what the current app actually renders — Edit,
 * Manage Groups, Remove. Its source defines Share but filters it out, so
 * carrying Share over would invent a capability. Actions remain disabled
 * until the write side exists (Inakshi, 2026-08-15).
 */
export function HorseCard({ horse, onPress }: { horse: HorseRow; onPress?: () => void }) {
  const { colors } = useTokens();
  const stallLabel = horse.stallName ?? 'No stall';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${horse.name}, ${stallLabel}`}
        testID={`horse-card-${horse.id}`}
        style={({ pressed }) => [styles.content, pressed && onPress && { opacity: 0.9 }]}>
        {/*
          The shared frame, WITHOUT its caption: the horse's name and stall
          already sit beside it, and a scrim caption on a 120pt tile would be
          unreadable. So the row gets the app's 4:3 corner-and-fallback
          treatment and nothing else (Inakshi, 2026-08-17).
        */}
        <View style={styles.thumb}>
          {horse.imageUri || horse.blurhash ? (
            <MediaTile
              posterUri={horse.imageUri}
              blurhash={horse.blurhash}
              tag={!horse.hasCamera ? { label: 'No camera' } : undefined}
              accessibilityLabel={`${horse.name} thumbnail`}
            />
          ) : (
            <View style={[styles.thumbFallback, { backgroundColor: colors.fillTonal }]}>
              <Icon name={horse.hasCamera ? 'horse' : 'cameraOff'} size={28} color={colors.accent} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
            {horse.name}
          </Text>
          <Text
            style={[type.subhead, { color: horse.stallName ? colors.secondary : colors.tertiary }]}
            numberOfLines={1}>
            {stallLabel}
          </Text>
        </View>
      </Pressable>

      <Menu
        icon="overflow"
        accessibilityLabel={`Options for ${horse.name}`}
        testID={`horse-options-${horse.id}`}
        width={44}
        height={44}
        title={horse.name}
        actions={[
          {
            id: 'edit',
            label: 'Edit',
            description: 'Review and update this horse’s details.',
            icon: 'edit',
            onPress: () => router.push({ pathname: '/horses/horse-form', params: { id: horse.id, mode: 'edit' } }),
          },
          {
            id: 'groups',
            label: 'Manage Groups',
            description: 'Choose which groups this horse belongs to.',
            icon: 'group',
            onPress: () => router.push({ pathname: '/horses/horse-groups', params: { id: horse.id } }),
          },
          {
            id: 'remove',
            label: 'Remove',
            description: 'Review this action before removing the horse.',
            icon: 'remove',
            destructive: true,
            onPress: () => router.push({ pathname: '/horses/delete-horse', params: { id: horse.id, name: horse.name } }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    paddingRight: 0,
  },
  thumb: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
  thumbFallback: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: space.xxs },
});
