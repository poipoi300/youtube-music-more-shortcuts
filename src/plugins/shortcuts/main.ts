import { type BrowserWindow, globalShortcut } from 'electron';
import is from 'electron-is';
import { register as registerElectronLocalShortcut } from 'electron-localshortcut';

import { getSongControls } from '@/providers/song-controls';

import { registerMPRIS } from './mpris';

import type { ShortcutMappingType, ShortcutsPluginConfig } from './index';
import type { BackendContext } from '@/types/contexts';

function _registerGlobalShortcut(
  webContents: Electron.WebContents,
  shortcut: string,
  action: (webContents: Electron.WebContents) => void,
) {
  const accelerators = ["CmdOrCtrl+Shift+Alt", "CmdOrCtrl+Shift", "CmdOrCtrl+Alt", "Shift+Alt", "CmdOrCtrl", "Shift", "Alt"];
  const makeTrulyGlobal = ["goBack", "goForward", "like", "dislike"];

  globalShortcut.register(shortcut, () => {
    action(webContents);
  });

  if (makeTrulyGlobal.includes(action.name)) {
    accelerators.forEach(accelerator => {
      globalShortcut.register(`${accelerator}+${shortcut}`, () => {
        action(webContents);
      });
    });
  }
}

function _registerLocalShortcut(
  win: BrowserWindow,
  shortcut: string,
  action: (webContents: Electron.WebContents) => void,
) {
  registerElectronLocalShortcut(win, shortcut, () => {
    action(win.webContents);
  });
}

export const onMainLoad = async ({
  getConfig,
  window,
}: BackendContext<ShortcutsPluginConfig>) => {
  const config = await getConfig();

  const songControls = getSongControls(window);
  const { playPause, next, previous, search } = songControls;

  if (config.overrideMediaKeys) {
    _registerGlobalShortcut(window.webContents, 'MediaPlayPause', playPause);
    _registerGlobalShortcut(window.webContents, 'MediaNextTrack', next);
    _registerGlobalShortcut(window.webContents, 'MediaPreviousTrack', previous);
  }

  _registerLocalShortcut(window, 'CommandOrControl+F', search);
  _registerLocalShortcut(window, 'CommandOrControl+L', search);

  if (is.linux()) {
    registerMPRIS(window);
  }

  const { global, local, rewindSeekSeconds } = config;
  const shortcutOptions = { global, local };

  for (const optionType in shortcutOptions) {
    registerAllShortcuts(
      shortcutOptions[optionType as 'global' | 'local'],
      optionType,
      rewindSeekSeconds,
    );
  }

  function registerAllShortcuts(container: ShortcutMappingType, type: string, rewindSeekSeconds: number) {
    for (const _action in container) {
      const action = _action as keyof ShortcutMappingType;

      if (!container[action]) {
        continue;
      }

      console.debug(
        `Registering ${type} shortcut`,
        container[action],
        ':',
        action,
      );

      let actionCallback: () => void;
      if (action === 'goForward' || action === 'goBack') {
        actionCallback = () => songControls[action](rewindSeekSeconds);
      } else {
        actionCallback = songControls[action];
      }

      if (typeof actionCallback !== 'function') {
        console.warn('Invalid action', action);
        continue;
      }

      if (type === 'global') {
        _registerGlobalShortcut(
          window.webContents,
          container[action],
          actionCallback,
        );
      } else {
        _registerLocalShortcut(window, local[action], actionCallback);
      }
    }
  }
};
