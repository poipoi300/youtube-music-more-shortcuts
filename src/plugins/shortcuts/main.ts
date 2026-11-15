import { type BrowserWindow, globalShortcut } from 'electron';
import is from 'electron-is';
import { register as registerElectronLocalShortcut } from 'electron-localshortcut';

import { getSongControls } from '@/providers/song-controls';

import { registerMPRIS } from './mpris';

import type { ShortcutMappingType, ShortcutsPluginConfig } from './index';
import type { BackendContext } from '@/types/contexts';

// Actions that also fire with any modifier held, so they work while another app has a
// modifier pressed (e.g. mid-game). Keyed by action name, not Function.name, which a
// minifier may rename.
const TRULY_GLOBAL_ACTIONS = new Set(['goBack', 'goForward', 'like', 'dislike']);
const MODIFIER_COMBOS = ['CmdOrCtrl+Shift+Alt', 'CmdOrCtrl+Shift', 'CmdOrCtrl+Alt', 'Shift+Alt', 'CmdOrCtrl', 'Shift', 'Alt'];

// Focus YouTube Music's search field (opening the box when it is collapsed) and select its text.
const FOCUS_SEARCH_JS = `(() => {
  const box = document.querySelector('ytmusic-search-box');
  if (!box) return;
  let input = box.querySelector('input');
  if (!input || input.offsetParent === null) {
    box.querySelector('#placeholder, tp-yt-paper-icon-button, yt-icon-button')?.click();
    input = box.querySelector('input');
  }
  input?.focus();
  input?.select();
})()`;
const focusSearch = (webContents: Electron.WebContents) => {
  webContents.executeJavaScript(FOCUS_SEARCH_JS).catch(console.error);
};

function _registerGlobalShortcut(
  webContents: Electron.WebContents,
  shortcut: string,
  action: (webContents: Electron.WebContents) => void,
  actionName?: string,
) {
  globalShortcut.register(shortcut, () => {
    action(webContents);
  });

  if (actionName && TRULY_GLOBAL_ACTIONS.has(actionName)) {
    MODIFIER_COMBOS.forEach((accelerator) => {
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
  const { playPause, next, previous } = songControls;

  if (config.overrideMediaKeys) {
    _registerGlobalShortcut(window.webContents, 'MediaPlayPause', playPause);
    _registerGlobalShortcut(window.webContents, 'MediaNextTrack', next);
    _registerGlobalShortcut(window.webContents, 'MediaPreviousTrack', previous);
  }

  _registerLocalShortcut(window, 'CommandOrControl+F', focusSearch);
  _registerLocalShortcut(window, 'CommandOrControl+L', focusSearch);

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
          action,
        );
      } else {
        _registerLocalShortcut(window, local[action], actionCallback);
      }
    }
  }
};
