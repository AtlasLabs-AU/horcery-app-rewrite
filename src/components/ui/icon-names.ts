/**
 * Every icon the app may draw, named by meaning rather than by glyph.
 * The per-platform maps beside this file are typed `Record<IconName, …>`, so
 * adding a name here is a compile error until BOTH platforms provide a glyph —
 * which is what stops an icon from silently rendering blank on one of them.
 */
export type IconName =
  // Navigation and chrome
  | 'menu'
  | 'back'
  | 'close'
  | 'chevronRight'
  | 'external'
  | 'search'
  | 'customize'
  | 'overflow'
  | 'check'
  | 'checkFilled'
  | 'circleEmpty'
  | 'filter'
  | 'play'
  | 'add'
  | 'edit'
  | 'share'
  | 'remove'
  | 'group'
  // Meaning
  | 'info'
  | 'ai'
  | 'settings'
  | 'clock'
  | 'temperature'
  | 'light'
  | 'humidity'
  // Menu / More destinations
  | 'account'
  | 'organization'
  | 'devices'
  | 'spaces'
  | 'clips'
  | 'alerts'
  | 'support'
  | 'logOut'
  | 'feedback'
  // Settings — on/off pairs so a row's icon can tell the truth on its own
  | 'notificationsOff'
  | 'wifi'
  | 'wifiOff'
  | 'sound'
  | 'soundOff'
  | 'darkMode'
  | 'camera'
  | 'cameraOff'
  // Auth
  | 'mail'
  | 'verified'
  | 'faceId'
  | 'showPassword'
  | 'hidePassword'
  // Behaviours and animals
  | 'lyingDown'
  | 'rolling'
  | 'peopleInStall'
  | 'peopleInteraction'
  | 'entering'
  | 'exiting'
  | 'inStall'
  | 'feed'
  | 'horse';
