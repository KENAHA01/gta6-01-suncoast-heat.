// Solmarina Heat - render.js
// Three.js scene, third-person camera, lighting and day-night cycle.
(function () {
  'use strict';
  var C = window.SH_CONFIG;

  function createRenderer(canvas) {
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }

  function createScene() {
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b5d6);
    scene.fog = new THREE.Fog(0x87b5d6, 180, 480);
    return scene;
  }

  function createLights(scene) {
    var sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
    sun.shadow.camera.far = 600;
    scene.add(sun);
    var amb = new THREE.AmbientLight(0x8899bb, 0.55);
    scene.add(amb);
    var hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a4a3a, 0.35);
    scene.add(hemi);
    return { sun: sun, amb: amb, hemi: hemi };
  }

  // Day-night: minutes 0-1440. Returns daylight factor 0..1.
  function applyDayNight(lights, scene, minutes) {
    var t = (minutes % 1440) / 1440;              // 0 = midnight
    var sunAngle = (t - 0.25) * Math.PI * 2;       // noon at t = 0.5
    var elev = Math.sin(sunAngle);                 // -1..1
    var day = Math.max(0, Math.min(1, elev * 1.6 + 0.25));
    var sun = lights.sun;
    sun.position.set(Math.cos(sunAngle) * 220, Math.max(20, elev * 220 + 30), 90);
    sun.intensity = 0.15 + day * 1.0;
    lights.amb.intensity = 0.18 + day * 0.4;
    lights.hemi.intensity = 0.12 + day * 0.3;
    var sky = new THREE.Color();
    if (day > 0.6) sky.setHex(0x87b5d6);
    else if (day > 0.25) sky.setHex(0xe8a06a);     // sunset orange
    else sky.setHex(0x1a2440);                     // night blue
    scene.background = sky;
    scene.fog.color.copy(sky);
    return day;
  }

  // Third-person camera: sits behind and above a target, yaw orbits with the mouse.
  // target: {x, z}, yaw: radians, dist/height from config. Returns nothing, moves camera.
  function updateCamera(camera, target, yaw, pitch) {
    var dist = C.CAM_DIST, h = C.CAM_HEIGHT;
    var cx = target.x - Math.sin(yaw) * dist * Math.cos(pitch);
    var cz = target.z - Math.cos(yaw) * dist * Math.cos(pitch);
    var cy = h + Math.sin(pitch) * dist * 0.6;
    camera.position.set(cx, cy, cz);
    camera.lookAt(target.x, C.CAM_LOOK_UP, target.z);
  }

  window.SH_RENDER = {
    createRenderer: createRenderer, createScene: createScene,
    createLights: createLights, applyDayNight: applyDayNight,
    updateCamera: updateCamera
  };
})();
