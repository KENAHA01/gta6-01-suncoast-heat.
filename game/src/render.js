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
    // Sky dome: a big sphere with a painted vertical gradient (zenith blue
    // to warm horizon), so the sky is a real dome, not a flat colour.
    // The material colour is tinted by applyDayNight for dusk/night.
    var cv = document.createElement('canvas');
    cv.width = 4; cv.height = 256;
    var cx = cv.getContext('2d');
    var grad = cx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#4a8ac8');
    grad.addColorStop(0.55, '#87b5d6');
    grad.addColorStop(0.8, '#f7d9a8');
    grad.addColorStop(1, '#f0c890');
    cx.fillStyle = grad;
    cx.fillRect(0, 0, 4, 256);
    var domeMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(cv), side: THREE.BackSide, fog: false
    });
    var dome = new THREE.Mesh(new THREE.SphereGeometry(800, 24, 16), domeMat);
    scene.add(dome);
    scene.userData.skyDomeMat = domeMat;
    // Clouds: flat white puffs drifting slowly over the city. They sell
    // the scale of the sky and make the horizon read as 3D depth.
    var cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, fog: false });
    var clouds = [];
    var spots = [
      [-180, 70, -160], [-60, 85, -200], [90, 65, -180], [200, 80, -60],
      [-220, 75, 40], [60, 90, 120], [-40, 68, 200], [180, 72, 160]
    ];
    spots.forEach(function (s) {
      var cl = new THREE.Group();
      var puffs = [[0, 0, 0, 7], [6, -1, 1, 5], [-6, -1, -1, 5.5]];
      puffs.forEach(function (p) {
        var puff = new THREE.Mesh(new THREE.SphereGeometry(p[3], 8, 6), cloudMat);
        puff.scale.y = 0.42;
        puff.position.set(p[0], p[1], p[2]);
        cl.add(puff);
      });
      cl.position.set(s[0], s[1], s[2]);
      scene.add(cl);
      clouds.push(cl);
    });
    scene.userData.clouds = clouds;
    scene.userData.cloudMat = cloudMat;
    return scene;
  }

  // Drift the clouds slowly; wrap around the city bounds.
  function updateClouds(scene, dt) {
    var clouds = scene.userData.clouds;
    if (!clouds) return;
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      cl.position.x += dt * 1.5;
      if (cl.position.x > 380) cl.position.x = -380;
    }
  }

  function createLights(scene) {
    var sun = new THREE.DirectionalLight(0xffe8c0, 1.3);
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
    // tint the sky dome + clouds with the same time of day, so the dome
    // never stays bright blue at night.
    var domeMat = scene.userData.skyDomeMat;
    if (domeMat) {
      if (day > 0.6) domeMat.color.setHex(0xffffff);
      else if (day > 0.25) domeMat.color.setHex(0xffc090);
      else domeMat.color.setHex(0x33405e);
    }
    var cloudMat = scene.userData.cloudMat;
    if (cloudMat) {
      if (day > 0.6) cloudMat.color.setHex(0xffffff);
      else if (day > 0.25) cloudMat.color.setHex(0xf0c0a0);
      else cloudMat.color.setHex(0x2a3348);
    }
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
    updateCamera: updateCamera, updateClouds: updateClouds
  };
})();
