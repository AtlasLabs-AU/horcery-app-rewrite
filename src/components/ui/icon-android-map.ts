import type { ImageSourcePropType } from 'react-native';

import type { IconName } from '@/components/ui/icon-names';

/**
 * Android glyphs — outlined Material Symbols XML vector drawables. Each
 * `require` is a Metro asset reference, not code, so only the icons listed
 * here are bundled.
 */
const ANDROID: Record<IconName, ImageSourcePropType> = {
  menu: require('@expo/material-symbols/menu.xml'),
  back: require('@expo/material-symbols/arrow_back.xml'),
  close: require('@expo/material-symbols/close.xml'),
  chevronRight: require('@expo/material-symbols/chevron_right.xml'),
  external: require('@expo/material-symbols/arrow_outward.xml'),
  search: require('@expo/material-symbols/search.xml'),
  customize: require('@expo/material-symbols/tune.xml'),
  overflow: require('@expo/material-symbols/more_vert.xml'),
  check: require('@expo/material-symbols/check.xml'),
  checkFilled: require('@expo/material-symbols/check_circle.xml'),
  circleEmpty: require('@expo/material-symbols/radio_button_unchecked.xml'),
  filter: require('@expo/material-symbols/filter_list.xml'),
  play: require('@expo/material-symbols/play_arrow.xml'),
  add: require('@expo/material-symbols/add.xml'),
  edit: require('@expo/material-symbols/edit.xml'),
  share: require('@expo/material-symbols/share.xml'),
  remove: require('@expo/material-symbols/delete.xml'),
  group: require('@expo/material-symbols/folder.xml'),
  info: require('@expo/material-symbols/info.xml'),
  ai: require('@expo/material-symbols/stars.xml'),
  settings: require('@expo/material-symbols/settings.xml'),
  clock: require('@expo/material-symbols/schedule.xml'),
  temperature: require('@expo/material-symbols/thermostat.xml'),
  humidity: require('@expo/material-symbols/water_drop.xml'),
  account: require('@expo/material-symbols/person.xml'),
  organization: require('@expo/material-symbols/apartment.xml'),
  devices: require('@expo/material-symbols/sensors.xml'),
  spaces: require('@expo/material-symbols/videocam.xml'),
  clips: require('@expo/material-symbols/movie.xml'),
  alerts: require('@expo/material-symbols/notifications.xml'),
  support: require('@expo/material-symbols/help.xml'),
  logOut: require('@expo/material-symbols/logout.xml'),
  feedback: require('@expo/material-symbols/chat.xml'),
  notificationsOff: require('@expo/material-symbols/notifications_off.xml'),
  wifi: require('@expo/material-symbols/wifi.xml'),
  wifiOff: require('@expo/material-symbols/wifi_off.xml'),
  sound: require('@expo/material-symbols/volume_up.xml'),
  soundOff: require('@expo/material-symbols/volume_off.xml'),
  darkMode: require('@expo/material-symbols/dark_mode.xml'),
  camera: require('@expo/material-symbols/videocam.xml'),
  cameraOff: require('@expo/material-symbols/videocam_off.xml'),
  mail: require('@expo/material-symbols/mail.xml'),
  verified: require('@expo/material-symbols/verified.xml'),
  faceId: require('@expo/material-symbols/face.xml'),
  showPassword: require('@expo/material-symbols/visibility.xml'),
  hidePassword: require('@expo/material-symbols/visibility_off.xml'),
  lyingDown: require('@expo/material-symbols/bedtime.xml'),
  rolling: require('@expo/material-symbols/rotate_right.xml'),
  peopleInStall: require('@expo/material-symbols/person.xml'),
  peopleInteraction: require('@expo/material-symbols/handshake.xml'),
  entering: require('@expo/material-symbols/login.xml'),
  exiting: require('@expo/material-symbols/logout.xml'),
  inStall: require('@expo/material-symbols/home.xml'),
  feed: require('@expo/material-symbols/restaurant.xml'),
  horse: require('@expo/material-symbols/pets.xml'),
};

export function androidDrawableFor(name: IconName): ImageSourcePropType {
  return ANDROID[name];
}
