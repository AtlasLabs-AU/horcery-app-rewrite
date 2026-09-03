import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';
import { motion, radius, space, type } from '@/constants/tokens';

/**
 * Every camera frame in the app is 4:3 (Inakshi, 2026-08-14, reaffirmed
 * 2026-08-17 when the Review History clip stills moved from 3:2 to match).
 */
export const MEDIA_ASPECT = 4 / 3;

export interface MediaTileProps {
  /** Still frame. The tile shows this until (and unless) a video plays. */
  posterUri?: string;
  /** BlurHash drawn while the still loads. */
  blurhash?: string;
  /**
   * Stream for this frame. Supplying it does NOT start playback — `live`
   * does. A tile with no `videoUri` is a still and costs nothing to keep on
   * screen, which is why most callers pass none.
   */
  videoUri?: string;
  /**
   * Play, right now. Exactly one tile in a row or page should have this true
   * (PRINCIPLES #2; the current app mounts a player per tile and never
   * releases them, which is the single largest cost on For You).
   *
   * Note this gates PLAYBACK, not the player: passing `videoUri` still
   * constructs one. Callers rendering a row should pass `videoUri` only to the
   * tile that is actually going to play, so there is one player and not N
   * paused ones.
   */
  live?: boolean;
  /** Live barn audio is off unless asked for. */
  muted?: boolean;
  /**
   * The stream failed. The tile keeps showing its still, so the caller can
   * say so rather than leaving a black rectangle where video should be.
   */
  onPlaybackError?: () => void;
  /** Caption line one — the horse, or the stall. */
  title?: string;
  /** Caption line two — "Stall 4 · 12 min ago". */
  subtitle?: string;
  /** Small glyph before the subtitle, e.g. the behaviour that was seen. */
  subtitleIcon?: IconName;
  /** Bottom-right pill — a clip's length. */
  badge?: string;
  /** Centre play affordance, for a frame that stands for a recorded clip. */
  showPlayBadge?: boolean;
  /** Top-right tag. `alert` paints it with the status colour. */
  tag?: { label: string; tone?: 'alert' | 'neutral' };
  onPress?: () => void;
  /** Defaults to the caption; supply one when the caption is omitted. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  /** Tighter caption type for small tiles (grid cells, list thumbnails). */
  compact?: boolean;
}

/**
 * The app's camera frame — one component behind every still and stream.
 *
 * **The confirmed treatment (Inakshi, 2026-08-17, "overlay"):** the frame
 * fills its box at 4:3 with continuous-curve corners, and the caption sits
 * ON the image over a bottom gradient scrim — white name, muted second line.
 * It is the one place in the editorial palette where type is not ink, and it
 * is legitimate because the surface underneath is a photograph rather than a
 * themed surface; `onMedia`/`scrim` in `tokens.ts` say so.
 *
 * Before this existed the app had five treatments — 4:3 and 3:2 frames, text
 * above, below and beside, two corner radii — because each screen drew its
 * own. Callers now choose *content*, never appearance.
 *
 * Omitting `title` and `subtitle` omits the scrim entirely: that is the
 * thumbnail case (the Horses row), where the caption already sits beside the
 * frame and painting it on a 120pt tile would be unreadable.
 */
export function MediaTile({
  posterUri,
  blurhash,
  videoUri,
  live = false,
  muted = true,
  onPlaybackError,
  title,
  subtitle,
  subtitleIcon,
  badge,
  showPlayBadge,
  tag,
  onPress,
  accessibilityLabel,
  testID,
  style,
  compact = false,
}: MediaTileProps) {
  const { colors } = useTokens();
  const hasCaption = !!title || !!subtitle;
  const caption = [title, subtitle].filter(Boolean).join(', ');
  const label = accessibilityLabel ?? (caption || undefined);

  const body = (
    <View style={[styles.frame, { backgroundColor: colors.mediaWell }, style]}>
      {posterUri || blurhash ? (
        <Image
          source={posterUri}
          placeholder={blurhash ? { blurhash } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={motion.fast}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      {videoUri ? (
        // Keyed on `muted` so toggling audio rebuilds the player. The React
        // Compiler forbids assigning to `player.muted` after construction, and
        // for a live stream a rebuild is nearly free — it reconnects at the
        // live edge, which is where it already was.
        <TileVideo
          key={muted ? 'muted' : 'audible'}
          uri={videoUri}
          live={live}
          muted={muted}
          onError={onPlaybackError}
        />
      ) : null}

      {/* Scrim first: everything below is painted ON it, so a duration pill
          in the same corner as the caption is never dimmed by the gradient. */}
      {hasCaption ? (
        <LinearGradient
          colors={[colors.scrimClear, colors.scrim]}
          style={styles.scrim}
          pointerEvents="none">
          {/*
            The badge is a SIBLING of the words, not an overlay on them: as an
            absolutely-positioned pill it sat on top of the second line and
            ate the stall name ("Lying Down · Stal…" behind a "42m" chip).
          */}
          <View style={styles.captionWords}>
            {title ? (
              <Text
                style={[
                  compact ? type.subhead : type.headline,
                  styles.title,
                  { color: colors.onMedia },
                ]}
                numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <View style={styles.subtitleRow}>
                {subtitleIcon ? (
                  <Icon name={subtitleIcon} size={12} color={colors.onMediaMuted} />
                ) : null}
                <Text
                  style={[type.footnote, styles.subtitle, { color: colors.onMediaMuted }]}
                  numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
            ) : null}
          </View>
          {badge ? (
            <View style={[styles.inlineBadge, { backgroundColor: colors.scrim }]}>
              <Text style={[type.caption, { color: colors.onMedia }]}>{badge}</Text>
            </View>
          ) : null}
        </LinearGradient>
      ) : null}

      {showPlayBadge ? (
        <View style={styles.centre} pointerEvents="none">
          <View style={[styles.playBadge, { backgroundColor: colors.card }]}>
            <Icon name="play" size={18} color={colors.accent} />
          </View>
        </View>
      ) : null}

      {tag ? (
        <View
          style={[
            styles.tag,
            {
              backgroundColor:
                tag.tone === 'alert' ? colors.statusAlert : colors.scrim,
            },
          ]}>
          <Text style={[type.caption, styles.tagText, { color: colors.onMedia }]}>
            {tag.label}
          </Text>
        </View>
      ) : null}

      {badge && !hasCaption ? (
        <View style={[styles.badge, { backgroundColor: colors.scrim }]}>
          <Text style={[type.caption, { color: colors.onMedia }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible={!!label} accessibilityLabel={label} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {body}
    </Pressable>
  );
}

/**
 * Split out so the player hook only ever runs for a tile that has a stream —
 * `useVideoPlayer` cannot be called conditionally inside `MediaTile` itself.
 */
function TileVideo({
  uri,
  live,
  muted,
  onError,
}: {
  uri: string;
  live: boolean;
  muted: boolean;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    // A live stream has no end to loop back to; looping only makes sense for
    // a recorded clip standing in for itself.
    instance.loop = !live;
    instance.muted = muted;
  });

  /**
   * Playback is driven from an effect, never from render. Correcting it
   * during render gates on `player.playing`, which is still false while
   * playback is starting — so on first mount nothing paused and every tile
   * decoded at once (found in the carousel prototype).
   */
  useEffect(() => {
    if (live && !failed) player.play();
    else player.pause();
  }, [live, failed, player]);

  /**
   * A barn camera can be offline, and an HLS manifest that 404s otherwise
   * leaves a black rectangle where the still used to be. Unmounting the video
   * lets the poster show through, and the caller gets told so it can say why.
   */
  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        setFailed(true);
        onError?.();
      }
    });
    return () => subscription.remove();
  }, [player, onError]);

  if (failed) return null;

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: MEDIA_ASPECT,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  centre: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  captionWords: { flex: 1, minWidth: 0 },
  inlineBadge: {
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  title: { fontFamily: font.bold },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: 1,
  },
  subtitle: { flexShrink: 1 },
  tag: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 3,
  },
  tagText: { fontFamily: font.semibold },
  badge: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
});
