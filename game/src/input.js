// Solmarina Heat - input.js
// Keyboard + mouse. Mouse uses pointer lock for orbit/aim; click shoots.
(function () {
  'use strict';

  var keys = {};
  var mouseDX = 0, mouseDY = 0;
  var mouseDown = false;
  var locked = false;
  var justPressed = {};

  function init(canvas, onLockChange) {
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (!keys[k]) justPressed[k] = true;
      keys[k] = true;
      if (k === ' ' || k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      keys[e.key.toLowerCase()] = false;
    });
    window.addEventListener('blur', function () { keys = {}; });

    canvas.addEventListener('click', function () {
      if (!locked) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', function () {
      locked = document.pointerLockElement === canvas;
      if (onLockChange) onLockChange(locked);
    });
    document.addEventListener('mousemove', function (e) {
      if (locked) { mouseDX += e.movementX || 0; mouseDY += e.movementY || 0; }
    });
    canvas.addEventListener('mousedown', function (e) {
      if (e.button === 0) mouseDown = true;
    });
    window.addEventListener('mouseup', function (e) {
      if (e.button === 0) mouseDown = false;
    });
  }

  function axis() {
    var x = 0, z = 0;
    if (keys['w'] || keys['arrowup']) z -= 1;
    if (keys['s'] || keys['arrowdown']) z += 1;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    return { x: x, z: z };
  }

  function consumeMouse() {
    var d = { dx: mouseDX, dy: mouseDY };
    mouseDX = 0; mouseDY = 0;
    return d;
  }
  function consumePressed(key) {
    var v = !!justPressed[key];
    justPressed[key] = false;
    return v;
  }
  function endFrame() { justPressed = {}; }

  window.SH_INPUT = {
    init: init, keys: keys, axis: axis,
    consumeMouse: consumeMouse, consumePressed: consumePressed,
    endFrame: endFrame,
    isMouseDown: function () { return mouseDown; },
    isLocked: function () { return locked; }
  };
})();
