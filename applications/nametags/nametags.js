//
// Copyright 2024 Overte e.V.
//
// Written by Armored Dragon
// Distributed under the Apache License, Version 2.0.
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html

(function () {
  "use strict";

  const ContextMenu = Script.require("contextMenu");

  let user_nametags = {};
  let last_camera_mode = Camera.mode;
  let simplifiedNametagsUrl;

  // Settings
  let visible = Settings.getValue("Nametags_toggle", true);
  let visibleSelf = Settings.getValue("Nametags_toggleself", false);
  let optionClickable = Settings.getValue("Nametags_toggleclick", true);
  let optionScale = Settings.getValue("Nametags_togglescale", true);

  const COLOUR_ENABLED = "lightgreen";
  const COLOUR_DISABLED = "red";
  const COLOUR_INACTIVE = [128, 128, 128];

  const MENU_ROOT = "View"
  const MENU_SUBMENU = "Nametags"
  const MENU_VIEW_SUBMENU = `${MENU_ROOT} > ${MENU_SUBMENU}`

  const MENU_VISIBLE_NAME = "Always shown";
  const MENU_VISIBLESELF_NAME = "Show my nametag";
  const MENU_CLICKABLE_NAME = "Click avatar to show/expand";
  const MENU_SCALE_NAME = "Scale with avatar";

  const DEFAULT_ENTITY_DIMENSIONS = { x: 0.8, y: 0.2, z: 0.1 };
  const DEFAULT_LINE_HEIGHT = 0.1;
  const ENLARGED_MULTIPLIER = 4;

  setup();

  function setup() {
    // Disable built in nametags
    //  after a delay to ensure other scripts have been loaded
    Script.setTimeout(() => {
      const runningScripts = ScriptDiscoveryService.getRunning();
      for (const script of runningScripts) {
        if (script.name === "simplifiedNametag.js") {
          print ("Disabling", script.name);
          ScriptDiscoveryService.stopScript(script.url);
          simplifiedNametagsUrl = script.url;
        }
      }
    }, 3000);

    if (visible) _updateList();
  }



  AvatarManager.avatarAddedEvent.connect(_handleConnectingUser); // New user connected
  AvatarManager.avatarRemovedEvent.connect(_removeUser); // User disconnected
  AvatarManager.avatarSessionChangedEvent.connect(_avatarSessionChanged);
  Script.update.connect(_adjustNametags); // Delta time
  Controller.mousePressEvent.connect(_onMousePress);

  Script.scriptEnding.connect(_scriptEnding); // Script was uninstalled
  Menu.menuItemEvent.connect(_handleMenuClick); // Toggle the nametag

  // Messages
  Messages.subscribe(CHANNEL_CLICK_CONTEXT);
  Messages.messageReceived.connect(_handleMessage);

  // Toolbar icon
  let tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
  let tabletButton = tablet.addButton({
    icon: Script.resolvePath("./assets/nametags-i.svg"),
    activeIcon: Script.resolvePath("./assets/nametags-a.svg"),
    text: "NAMETAGS",
    isActive: visible,
  });
  tabletButton.clicked.connect(_triggerMenuVisible);

  // View menu
  //

  Menu.addMenu(MENU_VIEW_SUBMENU);

  Menu.addMenuItem({
    menuName: MENU_VIEW_SUBMENU,
    menuItemName: MENU_VISIBLE_NAME,
    shortcutKey: "CTRL+N",
    isCheckable: true,
    isChecked: visible,
  });

  Menu.addMenuItem({
    menuName: MENU_VIEW_SUBMENU,
    menuItemName: MENU_VISIBLESELF_NAME,
    isCheckable: true,
    isChecked: visibleSelf,
  });

  Menu.addMenuItem({
    menuName: MENU_VIEW_SUBMENU,
    menuItemName: MENU_CLICKABLE_NAME,
    isCheckable: true,
    isChecked: optionClickable,
  });

  Menu.addMenuItem({
    menuName: MENU_VIEW_SUBMENU,
    menuItemName: MENU_SCALE_NAME,
    isCheckable: true,
    isChecked: optionScale,
  });


  // ContextMenu
  //

  const actionSet = [
    {
      text: textToggle(visible)+" Nametags",
      localClickFunc: "nametags.toggle",
      textColor: textColour(visible),
      priority: -5,
    },
    {
      text: textToggle(visibleSelf)+" My Nametag",
      localClickFunc: "nametags.toggleSelf",
      textColor: visible ?
      textColour(visibleSelf)
      : COLOUR_INACTIVE,
      priority: -4.9,
    },
  ];

  ContextMenu.registerActionSet("nametags", [{
    text: "> Nametags",
    submenu: "nametags.menu",
    backgroundColor: [0, 0, 0],
    textColor: "white",
    priority: -5,
  }], "_SELF");

  ContextMenu.registerActionSet("nametags.menu", actionSet, undefined, "Nametags");

  function _updateActionSet() {
    actionSet[0].text = textToggle(visible)+" Nametags";
    actionSet[0].textColor = textColour(visible);
    actionSet[1].text = textToggle(visibleSelf)+" My Nametag";
    actionSet[1].textColor = visible ?
    textColour(visibleSelf)
    : COLOUR_INACTIVE;

    ContextMenu.editActionSet("nametags.menu", actionSet);
  }


  // Helper functions
  //

  const MAX_LINE_WIDTH = 1;
  const MAX_WORD_WIDTH = 0.5;
  const MIN_WORD_LENGTH = 5;
  const MAX_LINES = 3;
  /*
   * Takes the displayName and inserts linebreaks
   * where appropriate to keep it under a certain
   * width when displayed on the user's nametag.
   */
  function calculateLines(user_uuid, text) {
    const textEntityId = user_nametags[user_uuid].text
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';
    let lineCount = 0;

    const moreThanMaxLines = () => !user_nametags[user_uuid].showFullName && lineCount != null && lineCount >= MAX_LINES;

    // Iterate over each word to check the line length with each word appended
    // If it becomes too long, creates a new line with that that word and
    // continues; for very long words will instead iterate over each character
    // and will insert a line break in the middle of the word where appropriate.
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let testLine = currentLine ?
                        `${currentLine} ${word}`
                        : word;
      let lineSize = Entities.textSize(textEntityId, testLine);

      const maxLineWidth = MAX_LINE_WIDTH * _enlargedMultiplier(user_uuid);

      if (lineSize.width <= maxLineWidth) {
        currentLine = testLine;
      } else {
        if (moreThanMaxLines()) break;

        // But what if a single word is too long?
        let wordSize = Entities.textSize(textEntityId, word);
        if (wordSize.width >= MAX_WORD_WIDTH) {
          let sub = ' ';
          charCount = 0;
          for (const char of word) {
            charCount++;
            testLine = `${currentLine}${sub+char}`
            const testWord = currentLine + ' ' + sub + char;
            lineSize = Entities.textSize(textEntityId, testLine);
            if (lineSize.width <= maxLineWidth) {
              sub = sub+char;
            } else {
              if (charCount >= MIN_WORD_LENGTH) {
                lines.push(testLine);
                lineCount++;
                if (moreThanMaxLines()) break;
                sub = '';
                currentLine = sub;
              } else {
                lines.push(currentLine);
                lineCount++;
                if (moreThanMaxLines()) break;
                sub = sub+char;
                currentLine = '';
              }
            }
          }
          currentLine = sub;
        } else {
          lines.push(currentLine);
          lineCount++;

          if (moreThanMaxLines()) break;

          currentLine = word;
        }
      }
    }

    if (currentLine && (user_nametags[user_uuid].showFullName || lineCount < MAX_LINES)) {
      lines.push(currentLine);
    }

    if (!user_nametags[user_uuid].showFullName && lineCount === MAX_LINES) {
      lines[MAX_LINES-1] = lines[MAX_LINES-1]+"...";
    }

    return lines;
  }

  // Avatar display name as shown on nametags
  function _displayName(user) {
    return user.displayName ? user.displayName : "Anonymous"
  }

  // There is no built in way to know if an avatar
  //  has fully loaded in, so we check for what we
  //  know should be true of a fully loaded avatar
  //    * The "Head" joint index will not be -1
  //    * The "Head" joint y translation will not be `0`
  //  An avatar which has not finished loading can can have a head index of > -1, whilst still not having a y value yet.
  function _hasAvatarLoaded(user) {
    const headJointIndex = user.getJointIndex("Head");
    return headJointIndex !== -1
    && user.getAbsoluteJointTranslationInObjectFrame(headJointIndex).y != 0;
  }

  function _enlargedMultiplier(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    const scale = user.scale;
    const nametagScale = user_nametags[user_uuid].nametagScale;

    // Scale nametag as set (by distance, probably)
    const finalNametagScale = nametagScale ? nametagScale : 1;

    // Scale with avatars
    //  but not if nametags are supposed to be larger
    const finalScale = optionScale && finalNametagScale === 1 ? scale : 1;

    const finalMultiplier = finalNametagScale*finalScale;
    return finalMultiplier;
  }

  function _lineHeight(user_uuid) {
    return DEFAULT_LINE_HEIGHT * _enlargedMultiplier(user_uuid);
  }

  // Nametag position for use in creating or adjusting nametag entities
  function _nametagPosition(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    const headJointIndex = user.getJointIndex("Head");
    const jointInObjectFrame = user.getAbsoluteJointTranslationInObjectFrame(headJointIndex);
    const scale = user.scale;
    const nameTagHeight = user_nametags[user_uuid].size.height
    const newY = jointInObjectFrame.y + 0.4*Math.max(0.4, Math.min(scale, 4)) + (nameTagHeight/2)
    print(`User ${user.displayName}${user_uuid} Head: ${headJointIndex}, y: ${jointInObjectFrame.y} scale: ${scale}, newY: ${newY}`);
    return Vec3.sum(user.position,
                    {
                      x: 0.01,
                      y: newY,
                      z: 0,
                    });
  }


  // ContextMenu helpers
  //
  function textToggle(boolean) {
    return boolean ? "[X]" : "[   ]";
  }
  //
  function textColour(boolean) {
    return boolean ? COLOUR_ENABLED : COLOUR_DISABLED;
  }


  // Signal functions
  //

  // Handle switching between worlds
  function _avatarSessionChanged(newSessionUUID, oldSessionUUID) {
    print("newSessionUUID:", newSessionUUID); // null if leaving
    print("oldSessionUUID:", oldSessionUUID); // null if entering

    if (oldSessionUUID !== null) {
        if (user_nametags[oldSessionUUID]) _removeUser(oldSessionUUID);
    }

    if (visible && newSessionUUID !== null) {
      // This is MyAvatar only if MyAvatar.sessionUUID matches either oldSessionUUID, newSessionUUID or "{00000000-0000-0000-0000-000000000001}"
      const isSelf = [oldSessionUUID, "{00000000-0000-0000-0000-000000000001}", newSessionUUID].includes(MyAvatar.sessionUUID);

      if (!isSelf){
        _addUser(MyAvatar.sessionUUID);
      } else if (newSessionUUID !== "{00000000-0000-0000-0000-000000000001}"
          && visibleSelf
          && !Camera.mode.includes("first person")) {
            _addUser(newSessionUUID);
            last_camera_mode = Camera.mode;
      }
    }
  }

  function _handleMenuClick(menuItem) {
    switch(menuItem) {
      case MENU_VISIBLE_NAME:
        _toggleState();
        break;
      case MENU_VISIBLESELF_NAME:
        _toggleVisibleSelf();
        break;
      case MENU_CLICKABLE_NAME:
        _toggleClickableAvatars();
        break;
      case MENU_SCALE_NAME:
        _toggleScaleWithAvatars();
        break;
    }
  }

  function _onMousePress(event) {
    if (!optionClickable || event.button !== "LEFT") return; // Only left-click

    // Build a PickRay from the camera through the mouse position
    const pickRay = Camera.computePickRay(event.x, event.y);

    // Grab the list of all avatar session UUIDs currently known to the client
    const avatarIDs = AvatarList.getAvatarIdentifiers();

    const result = AvatarList.findRayIntersection(pickRay,
                                                  avatarIDs, // include
                                                  [MyAvatar.sessionUUID], // exclude
                                                  false,) // pickAgainstMesh

    if (result.intersects) {
      _handleAvatarClick(result);
    }
  }

  function _handleConnectingUser(user_uuid) {
    if (visible) _addUser(user_uuid);
  }

  // Message handling
  //
  // Channels
  var CHANNEL_CLICK_CONTEXT = ContextMenu.CLICK_FUNC_CHANNEL;
  //
  function _handleMessage(channel, message, sender) {
    if (channel === CHANNEL_CLICK_CONTEXT && sender === MyAvatar.sessionUUID) {
      try {
        data = JSON.parse(message)
      } catch (err) {
        console.error('Invalid JSON on Context Menu Click message:', message, err.message);
        return
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const func = data.func;

        if (typeof func !== 'undefined') {
          console.log('Func:', func);
          switch (func) {
            case "nametags.toggle":
              _triggerMenuVisible();
              break;
            case "nametags.toggleSelf":
              _toggleVisibleSelf();
              break;
          }

        } else {
          console.warn('"func" key not found in the JSON');
        }
      }
    }
  };

  // There is no way to change the visible toggle state of a menu item
  // without also triggering the menu action. So to keep it in sync, we
  // must instead always trigger the menu item whenever we want to
  // change the visible state.
  function _triggerMenuVisible() {
    Menu.triggerOption(MENU_VISIBLE_NAME);
  }


  // Business functions
  //

  // Add a user to the user list
  function _addUser(user_uuid) {
    if ((!visibleSelf
            && user_uuid === MyAvatar.sessionUUID)
        || user_nametags[user_uuid]) return;

    const user = AvatarList.getAvatar(user_uuid);
    const display_name = _displayName(user);

    console.log(`Registering ${display_name} (${user_uuid}) nametag`);

    user_nametags[user_uuid] = {
      text: {},
      background: {},
      scale: user.scale,
      displayName: display_name,
      skeletonModelURL: user.skeletonModelURL,
      size: {},
      visible: false,
      showFullName: false,
      nametagScale: 1,
    };

    _createNametagEntity(user_uuid,
                         display_name);

    // We need to have this on a timeout because "textSize" can not be determined instantly after the entity was created.
    // https://apidocs.overte.org/Entities.html#.textSize
    Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);

    if (!_hasAvatarLoaded(user) || !user_nametags[user_uuid].size.height) {
      // Avatar has not finished loading yet;
      //  we'll reposition when it's ready.
      print("Avatar is not loaded yet. Will retry...");
      Script.setTimeout(() => {_adjustNametagPosition(user_uuid)}, 200);
    }
  }

  function _createNametagEntity(user_uuid, display_name) {
    user_nametags[user_uuid].text = Entities.addEntity(
      {
        type: "Text",
        text: display_name,
        backgroundAlpha: 0.0,
        billboardMode: "full",
        dimensions: DEFAULT_ENTITY_DIMENSIONS,
        unlit: true,
        parentID: user_uuid,
        position: _nametagPosition(user_uuid),
        visible: true,
        isSolid: false,
        topMargin: 0.02 * _enlargedMultiplier(user_uuid),
        alignment: "center",
        lineHeight: _lineHeight(user_uuid),
        canCastShadow: false,
        grab: {
          grabbable: false
        },
        visible: false,
      },
      "local"
    );
    user_nametags[user_uuid].background = Entities.addEntity(
      {
        type: "Image",
        dimensions: { x: 0.8, y: 0.2, z: 0.1 },
        emissive: true,
        alpha: 0.8,
        keepAspectRatio: false,
        position: _nametagPosition(user_uuid),
        parentID: user_nametags[user_uuid].text,
        billboardMode: "full",
        imageURL: Script.resolvePath("./assets/badge.svg"),
        canCastShadow: false,
        grab: {
          grabbable: false
        },
        visible: false,
      },
      "local"
    );
  }

  function _MonitorAvatarLoading(user) {
    if(_hasAvatarLoaded(user)) {
      // We will delay setting the nametag position
      // as some details of the avatar may not be fully
      // loaded at this point, and may be subject to change
      // whilst it settles in.
      print(`${user.displayName}${user.sessionUUID} avatar loaded; moving nametag after delay...`);
      Script.setTimeout(() => {
        print(`${user.displayName}${user.sessionUUID} ...avatar nametag moved`);
        _adjustNametagPosition(user.sessionUUID);
      }, 10000);
    } else {
      Script.setTimeout(() => {
        _MonitorAvatarLoading(user);
      }, 100);
    }
  }

  function _adjustNametag(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);

    if (user.scale !== user_nametags[user_uuid].scale) {
      // Avatar is rescaling...

      if (user_nametags[user_uuid].visible === true) {
        Entities.editEntity(user_nametags[user_uuid].text, {
          visible: false,
        });
        Entities.editEntity(user_nametags[user_uuid].background, {
          visible: false,
        });
        user_nametags[user_uuid].visible = false;
      }

      user_nametags[user_uuid].scale = user.scale
      user_nametags[user_uuid].rescaling = true;
    } else if (user_nametags[user_uuid].rescaling === true) {
      // User has finished rescaling,
      //  but there may be a delay before the avatar finishes resizing.
      Script.setTimeout(() => {
        if (!user_nametags[user_uuid].rescaling) {
          Entities.editEntity(user_nametags[user_uuid].text, {
            lineHeight: _lineHeight(user_uuid),
            topMargin: 0.02 * _enlargedMultiplier(user_uuid),
          });
          user_nametags[user_uuid].textSize = null;
          user_nametags[user_uuid].lines = null;
          user_nametags[user_uuid].size = {};

          // Delay adjusting, to give the text entity time to catch up
          Script.setTimeout(() => {
            _adjustNametagSize(user_uuid);
            _adjustNametagPosition(user_uuid);
          }, 100);
        }
      }, 3000);

      user_nametags[user_uuid].rescaling = false;
    }

    const newAvatar = user.skeletonModelURL;
    const oldAvatar = user_nametags[user_uuid].skeletonModelURL
    if (newAvatar != oldAvatar) {
      print(`${user.displayName}${user.sessionUUID} changed skeleton. Adjusting nametag..`)
      _MonitorAvatarLoading(user);
      user_nametags[user_uuid].skeletonModelURL = newAvatar;
    }

    const newName = user.displayName;
    const oldName = user_nametags[user_uuid].displayName;
    if (newName !== oldName) {
      const display_name = _displayName(user);
      print(`New displayName ${display_name} (${newName}) for ${oldName}`)

      user_nametags[user_uuid].displayName = newName;

      // The displayName has changed so we need to clear the cached
      // textSize and display lines so they may be recalculated
      user_nametags[user_uuid].textSize = null;
      user_nametags[user_uuid].lines = null;
      user_nametags[user_uuid].size = {};

      // Adjust nametag size to accomodate new displayName
      _adjustNametagSize(user_uuid);
      _adjustNametagPosition(user_uuid);
    }
  }

  // Updates positions of existing nametags
  function _adjustNametags() {
    if (!visible) return;

    if (visibleSelf) {
      if (last_camera_mode !== Camera.mode) {
        if (Camera.mode.includes("first person")) _removeUser(MyAvatar.sessionUUID);
        else _addUser(MyAvatar.sessionUUID);
        last_camera_mode = Camera.mode;
      }
    }

    Object.keys(user_nametags).forEach((user_uuid) => {
      _adjustNametag(user_uuid);
    });
  }

  function _adjustNametagPosition(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    if (!user_nametags[user_uuid] || user_nametags[user_uuid]?.rescaling === true) return;

    if (!_hasAvatarLoaded(user)) {
      // Avatar has not finished loading yet;
      //  we'll reposition when it's ready.
      print(`${user_uuid}Avatar is not loaded yet. Will retry...`);
      _MonitorAvatarLoading(user);
      return
    } else if (!user_nametags[user_uuid].size.height) {
      print(`${user_uuid}Height not computed yet. Waiting...`);
      Script.setTimeout(() => {
        _adjustNametagPosition(user_uuid);
      }, 100);
      return;
    }

    Entities.editEntity(user_nametags[user_uuid].text, {
      position: _nametagPosition(user_uuid),
      visible: true,
    });

    Entities.editEntity(user_nametags[user_uuid].background, {
      visible: true,
    });
    user_nametags[user_uuid].visible = true
  }

  // Resize user's nametag entity
  function _adjustNametagSize(user_uuid) {
    const user = AvatarList.getAvatar(user_uuid);
    const scale = user.scale;
    const displayName = _displayName(user);
    let displayNameLines;
    let displayNameString;

    let textSizeRaw = Entities.textSize(user_nametags[user_uuid].text, displayName);
    const multiplier =  _enlargedMultiplier(user_uuid);
    const enlarged = multiplier > 1;

    if (!user_nametags[user_uuid].textSize) {

      // textSize has not yet been cached; we will calculate and cache it
      if (textSizeRaw.width === 0 || textSizeRaw.height === 0) {
        // Text size cannot be calculated immediately after entity creation;
        // We'll keep trying until textSize does not report 0.
        Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
        return;
      } else if (textSizeRaw.height <= 0.08*multiplier
        || textSizeRaw.height >= 0.2*multiplier
        || textSizeRaw.height == null) {
        // Text size returns unexpected values during entity
        // creation. When entity sizes are too large, too small
        // or invalid we ignore them.
        // See https://github.com/overte-org/overte/issues/1897.
        print(`!!! Text size for ${displayName} is an unexpected ${JSON.stringify(textSizeRaw)}; Not sizing yet.`);
        Script.setTimeout(() => {_adjustNametagSize(user_uuid)}, 100);
        return;
      } else {
        print(`Text size for ${displayName} is ${JSON.stringify(textSizeRaw)}`);

        if (!user_nametags[user_uuid].lines) {
          displayNameLines = calculateLines(user_uuid, displayName);
          user_nametags[user_uuid].lines = displayNameLines;
        } else {
          displayNameLines = user_nametags[user_uuid].lines;
        }
        print("Lines:", JSON.stringify(displayNameLines));

        displayNameString = displayNameLines.join('\n');
        textSizeRaw = Entities.textSize(user_nametags[user_uuid].text, displayNameString);

        user_nametags[user_uuid].textSize = { width: textSizeRaw.width, height: textSizeRaw.height };
      }
    } else {
      displayNameLines = user_nametags[user_uuid].lines
    }

    //user_nametags[user_uuid].lines = displayNameLines.length

    // Load textSize from cache
    const textSizeCache = user_nametags[user_uuid].textSize;
    print("textSizeCache:",JSON.stringify(textSizeCache));

    print("textSize fresh:",
          JSON.stringify(Entities.textSize(user_nametags[user_uuid].text,
                                           displayNameString)));

    let newWidth = textSizeCache.width + (0.25*multiplier);
    let newHeight = textSizeCache.height + (0.05*multiplier);
    print("newWidth:",newWidth,"newHeight:",newHeight);
    user_nametags[user_uuid].size.width = newWidth
    user_nametags[user_uuid].size.height = newHeight
    const renderLayer = enlarged ? "front" : "world";

    Entities.editEntity(user_nametags[user_uuid].text,
                        {
                          text: displayNameString,
                          dimensions: {
                            x: newWidth,
                            y: newHeight,
                            z: 0.1,
                          },
                          lineHeight: _lineHeight(user_uuid),
                          renderLayer: renderLayer,
                          topMargin: 0.02 * multiplier,
                        });
    Entities.editEntity(user_nametags[user_uuid].background,
                        {
                          dimensions: {
                            x: newWidth,
                            y: newHeight,
                            z: 0.1,
                          },
                        });
  }

  // Remove a user from the user list
  function _removeUser(user_uuid) {
    if (user_nametags[user_uuid]) {
      console.log(`Deleting ${user_uuid} nametag`);
      Entities.deleteEntity(user_nametags[user_uuid].text);
      Entities.deleteEntity(user_nametags[user_uuid].background);
      delete user_nametags[user_uuid];
    }
  }

  function _toggleClickableAvatars() {
    optionClickable = !optionClickable
    Settings.setValue("Nametags_toggleclick", optionClickable);
  }

  function _toggleScaleWithAvatars() {
    optionScale = !optionScale;
    Settings.setValue("Nametags_togglescale", optionScale);
  }

  function _handleAvatarClick(intersectionResult) { // RayToEntityIntersectionResult
    const user_uuid = intersectionResult.avatarID;

    // There seems to be a bug with findRayIntersection which affects only
    // certain avatars. See https://github.com/overte-org/overte/issues/1923
    // The workaround to this is to just compute the distance based on
    // their position, rather than the intersection
    const avatar = AvatarList.getAvatar(user_uuid);
    const distance = Vec3.distance(avatar.position, Camera.position);

    if (visible) {
      // temporarily change size of nametag

      // (re)set data for enlargement
      user_nametags[user_uuid].textSize = null;
      user_nametags[user_uuid].lines = null;
      user_nametags[user_uuid].size = {};
      user_nametags[user_uuid].nametagScale = distance/2;

      Entities.editEntity(user_nametags[user_uuid].text, {
        lineHeight: _lineHeight(user_uuid),
        topMargin: 0.02 * _enlargedMultiplier(user_uuid),
        visible: false,
      });

      // Restore original size after a delay
      Script.setTimeout(() => {
        if (!user_nametags[user_uuid]) return;
        //  unset enlarged variable
        user_nametags[user_uuid].textSize = null;
        user_nametags[user_uuid].lines = null;
        user_nametags[user_uuid].size = {};
        user_nametags[user_uuid].showFullName = false;
        user_nametags[user_uuid].nametagScale = 1;

        Entities.editEntity(user_nametags[user_uuid].text, {
          lineHeight: _lineHeight(user_uuid),
          topMargin: 0.02 * _enlargedMultiplier(user_uuid),
          visible: false,
        });

        // Adjust nameta after a short delay to allow time for
        // entity data to update
        Script.setTimeout(() => {
          _adjustNametagSize(user_uuid);
          _adjustNametagPosition(user_uuid);
        }, 100);
      }, 6000);

    } else {
      // Temporarily make nametag visible

      // addUser
      _addUser(user_uuid)

      // SetTimeout to removeUser, if !visible
      Script.setTimeout(() => {
        if (!visible) _removeUser(user_uuid);
      }, 6000);

    }
    user_nametags[user_uuid].showFullName = true;

    // Adjust nameta after a short delay to allow time for
    // entity data to update
    Script.setTimeout(() => {
      _adjustNametagSize(user_uuid);
      _adjustNametagPosition(user_uuid);
    }, 100);
  }

  // Enable or disable nametags
  function _toggleState() {
    visible = !visible;
    tabletButton.editProperties({ isActive: visible });
    Settings.setValue("Nametags_toggle", visible);
    _updateActionSet();

    if (!visible) Object.keys(user_nametags).forEach(_removeUser);
    if (visible){
      last_camera_mode = Camera.mode; // Update camera before _adjustNametags runs again
      _updateList();
    }
  }

  // Enable or disabled own nametag
  function _toggleVisibleSelf() {
    visibleSelf = !visibleSelf;
    Settings.setValue("Nametags_toggleself", visibleSelf);
    _updateActionSet()

    if (visible) {
      myUUID = MyAvatar.sessionUUID;
      if (!visibleSelf && user_nametags[myUUID]) _removeUser(myUUID);
      else if (visibleSelf){
        last_camera_mode = Camera.mode; // Update camera before _adjustNametags runs again
        _updateList();
      }
    }
  }

  function _updateList() {
    const include_self = visibleSelf && !HMD.active && !Camera.mode.includes("first person");
    var user_list = AvatarList.getAvatarIdentifiers();
    if (include_self) user_list.push(MyAvatar.sessionUUID);

    // Filter undefined values out
    user_list = user_list.filter((uuid) => uuid);

    user_list.forEach(_addUser);
  }

  // Clean up
  //

  function _scriptEnding() {
    // Restore built-in nametags
    if (simplifiedNametagsUrl) {
      print ("Enabling SimplifiedNametag from ", simplifiedNametagsUrl);
      ScriptDiscoveryService.loadScript(simplifiedNametagsUrl);
    }

    tablet.removeButton(tabletButton);
    Menu.removeMenuItem(MENU_VIEW_SUBMENU, MENU_VISIBLE_NAME);
    Menu.removeMenuItem(MENU_VIEW_SUBMENU, MENU_VISIBLESELF_NAME);
    Menu.removeMenuItem(MENU_VIEW_SUBMENU, MENU_CLICKABLE_NAME);
    Menu.removeMenuItem(MENU_VIEW_SUBMENU, MENU_SCALE_NAME);
    Menu.removeMenu(MENU_VIEW_SUBMENU);

    for (let i = 0; Object.keys(user_nametags).length > i; i++) {
      Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].text);
      Entities.deleteEntity(user_nametags[Object.keys(user_nametags)[i]].background);
    }
    user_nametags = {};
  }
})();
