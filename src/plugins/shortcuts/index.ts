import { createPlugin } from '@/utils';
import { onMainLoad } from './main';
import { onMenu } from './menu';
import { t } from '@/i18n';

export type ShortcutMappingType = {
  previous: string;
  playPause: string;
  next: string;
  goBack: string;
  goForward: string;
};
export type ShortcutsPluginConfig = {
  enabled: boolean;
  overrideMediaKeys: boolean;
  rewindSeekSeconds: number;
  global: ShortcutMappingType;
  local: ShortcutMappingType;
};

export default createPlugin({
  name: () => t('plugins.shortcuts.name'),
  description: () => t('plugins.shortcuts.description'),
  restartNeeded: true,
  config: {
    enabled: false,
    overrideMediaKeys: false,
    rewindSeekSeconds: 10,
    global: {
      previous: '',
      playPause: '',
      next: '',
      goBack: '',
      goForward: '',
      like: '',
      dislike: ''
    },
    local: {
      previous: '',
      playPause: '',
      next: '',
    },
  } as ShortcutsPluginConfig,
  menu: onMenu,

  backend: onMainLoad,
});
