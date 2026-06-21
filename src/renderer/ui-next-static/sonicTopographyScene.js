import * as THREE from 'three';

(function (global) {
  'use strict';

  var RIPPLE_COUNT = 10;
  var MAX_METEORS = 20;
  var MAX_PARTICLES = 200;

  var VERTEX_SHADER = `
    uniform float uTime;
    uniform float uSubBass;
    uniform float uBass;
    uniform float uLowMid;
    uniform float uMid;
    uniform float uHighMid;
    uniform float uSmoothness;
    uniform float uDensity;
    uniform float uEnergy;

    struct Ripple {
      vec2 pos;
      float time;
      float strength;
      float isActive;
      float rippleType;
    };
    uniform Ripple uRipples[10];

    varying vec2 vUv;
    varying float vElevation;
    varying float vDistance;
    varying vec2 vRippleAnim;
    varying vec3 vNormal;
    varying float vRelativeY;
    varying vec2 vInstancePos;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      vUv = uv;
      vNormal = normal;

      vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      vec2 pos2D = instancePos.xz;
      vInstancePos = pos2D;

      float centerDist = length(pos2D);
      vDistance = centerDist;
      float rnd = random(pos2D);

      vec2 movingPos = pos2D * 0.05 + vec2(uTime * 0.1, uTime * 0.05);
      float baseNoise = (snoise(movingPos) + 1.0) * 0.5;
      float wave = sin(pos2D.x * 0.15 + pos2D.y * 0.1 - uTime * 0.6) * 0.5 + 0.5;

      float globalFalloff = smoothstep(60.0, 30.0, centerDist);
      float idleElevation = mix(baseNoise, wave, uSmoothness * 0.5 + 0.2) * 0.8 * globalFalloff;

      float subRegion = smoothstep(25.0, 0.0, centerDist);
      float subLift = uSubBass * subRegion * 5.0;

      float bassNoise = snoise(pos2D * 0.1 - vec2(0.0, uTime * 0.2));
      float bassRegion = smoothstep(35.0, 5.0, centerDist + bassNoise * 5.0);
      float bassLift = uBass * bassRegion * smoothstep(0.0, 1.0, rnd + uDensity * 0.5) * 4.0;

      float lowMidNoise = snoise(pos2D * 0.05 + vec2(uTime * 0.1, 0.0));
      float lowMidLift = uLowMid * (lowMidNoise * 0.5 + 0.5) * 2.5;

      float riverFlow = sin(pos2D.x * 0.2 + pos2D.y * 0.2 + snoise(pos2D * 0.1) * 2.0 - uTime * 2.0);
      float midLift = uMid * max(0.0, riverFlow) * 3.0;

      float highMidRegion = smoothstep(10.0, 45.0, centerDist);
      float highMidLift = 0.0;
      if (fract(rnd * 13.3) > 0.8) {
        highMidLift = uHighMid * highMidRegion * fract(rnd * 7.7) * 2.5;
      }

      float audioElevation = (subLift + bassLift + lowMidLift + midLift + highMidLift) * globalFalloff;
      if (rnd > 0.99) {
        audioElevation += uEnergy * 5.0;
      }

      float elevation = idleElevation + audioElevation;

      float rippleElevation = 0.0;
      float rippleIntensityNormal = 0.0;
      float rippleIntensityWhite = 0.0;

      for (int i = 0; i < 10; i++) {
        if (uRipples[i].isActive > 0.0) {
          float dist = length(pos2D - uRipples[i].pos);
          float timeSince = uTime - uRipples[i].time;
          float curSpeed = uRipples[i].rippleType > 0.5 ? 20.0 : 15.0;
          float curWidth = uRipples[i].rippleType > 0.5 ? 1.0 : 3.0;
          float curFadeDist = uRipples[i].rippleType > 0.5 ? 8.0 : 15.0;
          float elevationScale = uRipples[i].rippleType > 0.5 ? 1.0 : 4.0;
          float waveRadius = timeSince * curSpeed;
          float d = dist - waveRadius;
          float rippleWave = exp(-d*d / curWidth);
          float fade = exp(-waveRadius / curFadeDist);
          float rPulse = rippleWave * fade * uRipples[i].strength;
          rippleElevation += rPulse * elevationScale;
          if (uRipples[i].rippleType > 0.5) {
            rippleIntensityWhite += rPulse;
          } else {
            rippleIntensityNormal += rPulse;
          }
        }
      }

      elevation += rippleElevation;
      vRippleAnim = vec2(clamp(rippleIntensityNormal, 0.0, 1.0), clamp(rippleIntensityWhite, 0.0, 1.0));
      vElevation = elevation;

      float yPos = position.y + 0.5;
      vRelativeY = yPos;
      float totalHeight = 1.0 + elevation;
      vec3 pos = position;
      pos.y = -0.5 + yPos * totalHeight;

      vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;

  var FRAGMENT_SHADER = `
    uniform float uTime;
    uniform float uPresence;
    uniform float uBrilliance;
    uniform float uAir;
    uniform float uWarmth;
    uniform float uBrightness;
    uniform float uSharpness;
    uniform vec3 uBaseColor1;
    uniform vec3 uBaseColor2;
    uniform vec3 uCoolCore;
    uniform vec3 uCoolEdge;
    uniform vec3 uWarmCore;
    uniform vec3 uWarmEdge;
    uniform vec3 uRippleColor;
    uniform float uGlowIntensity;

    varying vec2 vUv;
    varying float vElevation;
    varying float vDistance;
    varying vec2 vRippleAnim;
    varying vec3 vNormal;
    varying float vRelativeY;
    varying vec2 vInstancePos;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      bool isTop = vNormal.y > 0.5;
      float distFromTop = 1.0 - vRelativeY;
      float rnd = random(vInstancePos);
      float centerDist = length(vInstancePos);
      float normElevation = clamp(vElevation / 8.0, 0.0, 1.0);
      float cleanDetailFade = 1.0 - smoothstep(24.0, 58.0, centerDist);

      vec3 cBase1 = uBaseColor1;
      vec3 cBase2 = uBaseColor2;
      float warmBlend = smoothstep(0.0, 1.0, uWarmth * 1.5 + (0.5 - centerDist / 80.0));
      vec3 zoneCore = mix(uCoolCore, uWarmCore, warmBlend);
      vec3 zoneEdge = mix(uCoolEdge, uWarmEdge, warmBlend);
      vec3 targetGlow = mix(zoneCore, zoneEdge, fract(rnd * 11.0));
      float distFade = 1.0 - smoothstep(40.0, 75.0, centerDist);
      targetGlow = mix(targetGlow, uRippleColor, uBrightness * 0.6);
      vec3 currentGlow = mix(cBase2, targetGlow, normElevation) * uGlowIntensity * distFade;
      currentGlow = mix(currentGlow, uRippleColor, vRippleAnim.x);
      currentGlow = mix(currentGlow, vec3(1.0, 1.0, 1.0), vRippleAnim.y);

      vec3 bodyColor = mix(cBase1, cBase2, vRelativeY * distFade);
      vec3 finalColor;

      if (isTop) {
        float topIntensity = smoothstep(0.0, 0.4, normElevation);
        float twinkleDistFalloff = smoothstep(60.0, 30.0, centerDist);
        float twinkleMultiplier = cleanDetailFade * mix(twinkleDistFalloff, 0.72, smoothstep(0.04, 0.18, normElevation));
        bool isSparkleTarget = fract(rnd * 31.0) > 0.95;
        if (isSparkleTarget && normElevation < 0.1) {
          topIntensity += uAir * 0.45 * twinkleMultiplier;
        }

        finalColor = mix(cBase2, currentGlow, topIntensity);
        float edgeX = smoothstep(0.05, 0.01, vUv.x) + smoothstep(0.95, 0.99, vUv.x);
        float edgeY = smoothstep(0.05, 0.01, vUv.y) + smoothstep(0.95, 0.99, vUv.y);
        float edge = min(edgeX + edgeY, 1.0);
        finalColor += currentGlow * edge * 0.28 * cleanDetailFade * (topIntensity + 0.2);

        float flashChance = smoothstep(0.3, 1.0, uPresence);
        if (fract(rnd * 53.0) > 0.98 - flashChance * 0.1) {
          float flashSync = 0.32 + 0.18 * smoothstep(0.2, 1.0, uPresence);
          finalColor += mix(vec3(1.0), vec3(0.5, 1.0, 1.0), rnd) * flashSync * uPresence * (0.45 + uSharpness * 0.7) * twinkleMultiplier;
        }

        if (edge > 0.5 && fract(rnd * 89.0) > 0.985) {
          finalColor += vec3(1.0) * uBrilliance * 0.75 * twinkleMultiplier;
        }
      } else {
        float verticalFalloff = mix(1.0, 3.0, uSharpness);
        float sideGlow = smoothstep(0.5 / verticalFalloff, 0.0, distFromTop) * normElevation;
        if (normElevation < 0.02) sideGlow = 0.0;
        finalColor = mix(bodyColor, currentGlow, sideGlow * 1.5);
        float rimGlow = smoothstep(0.03, 0.0, distFromTop) * normElevation;
        finalColor += currentGlow * rimGlow;
      }

      finalColor += uRippleColor * vRippleAnim.x * 0.6;
      finalColor += vec3(1.0, 1.0, 1.0) * vRippleAnim.y * 1.2;

      float aerialFog = smoothstep(30.0, 65.0, vDistance);
      vec3 atmosphericColor = mix(cBase1, cBase2, 0.4);
      finalColor = mix(finalColor, atmosphericColor, aerialFog * 0.5);

      float alphaFade = 1.0 - smoothstep(55.0, 78.0, vDistance);
      gl_FragColor = vec4(finalColor, alphaFade);
    }
  `;

  var SONIC_THEMES = {
    'nocturnal': {
      name: 'Nocturnal',
      id: 'nocturnal',
      uBaseColor1: new THREE.Color(0.01, 0.02, 0.04),
      uBaseColor2: new THREE.Color(0.03, 0.05, 0.09),
      uCoolCore: new THREE.Color(0.0, 0.3, 1.0),
      uCoolEdge: new THREE.Color(0.6, 0.2, 1.0),
      uWarmCore: new THREE.Color(1.0, 0.2, 0.1),
      uWarmEdge: new THREE.Color(1.0, 0.6, 0.0),
      uRippleColor: new THREE.Color(0.2, 0.9, 1.0),
      uGlowIntensity: 1.0
    },
    'neon-tokyo': {
      name: 'Neon Tokyo',
      id: 'neon-tokyo',
      uBaseColor1: new THREE.Color(0.01, 0.005, 0.02),
      uBaseColor2: new THREE.Color(0.04, 0.01, 0.06),
      uCoolCore: new THREE.Color(1.0, 0.1, 0.6),
      uCoolEdge: new THREE.Color(0.6, 0.1, 1.0),
      uWarmCore: new THREE.Color(0.1, 1.0, 0.8),
      uWarmEdge: new THREE.Color(0.1, 0.4, 1.0),
      uRippleColor: new THREE.Color(1.0, 1.0, 1.0),
      uGlowIntensity: 1.5
    },
    'cyber-forest': {
      name: 'Cyber Forest',
      id: 'cyber-forest',
      uBaseColor1: new THREE.Color(0.01, 0.02, 0.01),
      uBaseColor2: new THREE.Color(0.02, 0.05, 0.02),
      uCoolCore: new THREE.Color(0.1, 1.0, 0.5),
      uCoolEdge: new THREE.Color(0.05, 0.5, 0.3),
      uWarmCore: new THREE.Color(0.8, 1.0, 0.1),
      uWarmEdge: new THREE.Color(0.9, 0.5, 0.1),
      uRippleColor: new THREE.Color(0.6, 1.0, 0.3),
      uGlowIntensity: 1.3
    },
    'minimal-monochrome': {
      name: 'Minimal Monochrome',
      id: 'minimal-monochrome',
      uBaseColor1: new THREE.Color(0.02, 0.02, 0.02),
      uBaseColor2: new THREE.Color(0.06, 0.06, 0.06),
      uCoolCore: new THREE.Color(0.9, 0.9, 0.9),
      uCoolEdge: new THREE.Color(0.4, 0.4, 0.4),
      uWarmCore: new THREE.Color(1.0, 1.0, 1.0),
      uWarmEdge: new THREE.Color(0.7, 0.7, 0.7),
      uRippleColor: new THREE.Color(1.0, 1.0, 1.0),
      uGlowIntensity: 0.8
    }
  };

  var SONIC_THEME_ORDER = Object.keys(SONIC_THEMES);

  function cloneTheme(theme) {
    return {
      name: theme.name,
      id: theme.id,
      uBaseColor1: theme.uBaseColor1.clone(),
      uBaseColor2: theme.uBaseColor2.clone(),
      uCoolCore: theme.uCoolCore.clone(),
      uCoolEdge: theme.uCoolEdge.clone(),
      uWarmCore: theme.uWarmCore.clone(),
      uWarmEdge: theme.uWarmEdge.clone(),
      uRippleColor: theme.uRippleColor.clone(),
      uGlowIntensity: theme.uGlowIntensity
    };
  }

  function createTheme(themeId) {
    return cloneTheme(SONIC_THEMES[themeId] || SONIC_THEMES.nocturnal);
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function makeRipple() {
    return {
      pos: new THREE.Vector2(),
      time: -100,
      strength: 0,
      isActive: 0,
      rippleType: 0
    };
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function createAudioData() {
    return {
      bass: 0,
      mid: 0,
      treble: 0,
      energy: 0,
      subBass: 0,
      lowMid: 0,
      highMid: 0,
      presence: 0,
      brilliance: 0,
      air: 0,
      warmth: 0,
      brightness: 0,
      sharpness: 0,
      smoothness: 0,
      density: 0,
      spectralCentroid: 0
    };
  }

  function deriveAudioDataFromSpectrum(input, previousData, previousBrightness) {
    var source = Array.isArray(input) ? input : [];
    var bins = new Array(512).fill(0);
    for (var i = 0; i < bins.length; i++) {
      var sourceIndex = Math.min(source.length - 1, Math.floor((i / bins.length) * Math.max(1, source.length)));
      bins[i] = source.length ? clamp01(source[sourceIndex]) : 0;
    }

    var energySum = 0;
    var centroidNum = 0;
    var centroidDen = 0;
    var subBassSum = 0;
    var bassSum = 0;
    var lowMidSum = 0;
    var midSum = 0;
    var highMidSum = 0;
    var presenceSum = 0;
    var brillianceSum = 0;
    var airSum = 0;
    var jumpVolatilitySum = 0;
    var previousBins = previousData.__bins || [];

    for (var i = 0; i < bins.length; i++) {
      var val = bins[i];
      energySum += val;
      centroidNum += i * val;
      centroidDen += val;
      jumpVolatilitySum += Math.abs(val - (previousBins[i] || 0));

      if (i <= 1) subBassSum += val;
      else if (i <= 3) bassSum += val;
      else if (i <= 7) lowMidSum += val;
      else if (i <= 18) midSum += val;
      else if (i <= 46) highMidSum += val;
      else if (i <= 93) presenceSum += val;
      else if (i <= 186) brillianceSum += val;
      else if (i <= 372) airSum += val;
    }

    var energy = energySum / bins.length;
    var subBass = subBassSum / 2;
    var bass = bassSum / 2;
    var lowMid = lowMidSum / 4;
    var mid = midSum / 11;
    var highMid = highMidSum / 28;
    var presence = presenceSum / 47;
    var brilliance = brillianceSum / 93;
    var air = airSum / 186;
    var oldBass = (subBassSum + bassSum + lowMidSum) / 8;
    var oldMid = (midSum + highMidSum) / 39;
    var oldTreble = (presenceSum + brillianceSum + airSum) / 326;
    var warmth = energySum > 0 ? (subBassSum + bassSum + lowMidSum + midSum) / energySum : 0;
    var brightness = energySum > 0 ? (presenceSum + brillianceSum + airSum) / energySum : 0;
    var sharpness = Math.max(0, brightness - previousBrightness) * 10;
    var smoothnessVal = Math.max(0, 1.0 - (jumpVolatilitySum / bins.length) * 2.0);
    var activeThreshold = energy * 1.5;
    var activeBands = 0;
    if (subBass > activeThreshold) activeBands++;
    if (bass > activeThreshold) activeBands++;
    if (lowMid > activeThreshold) activeBands++;
    if (mid > activeThreshold) activeBands++;
    if (highMid > activeThreshold) activeBands++;
    if (presence > activeThreshold) activeBands++;
    if (brilliance > activeThreshold) activeBands++;
    if (air > activeThreshold) activeBands++;

    return {
      raw: {
        bass: oldBass,
        mid: oldMid,
        treble: oldTreble,
        energy: energy,
        subBass: subBass,
        lowMid: lowMid,
        highMid: highMid,
        presence: presence,
        brilliance: brilliance,
        air: air,
        warmth: warmth,
        brightness: brightness,
        sharpness: sharpness,
        smoothness: smoothnessVal,
        density: activeBands / 8,
        spectralCentroid: centroidDen > 0 ? centroidNum / centroidDen : 0
      },
      bins: bins,
      brightness: brightness
    };
  }

  function SonicTopographyScene(canvas) {
    this.canvas = canvas;
    this.gridSize = 160;
    this.spacing = 1.05;
    this.count = this.gridSize * this.gridSize;
    this.themeId = 'nocturnal';
    this.theme = createTheme(this.themeId);
    this.targetTheme = createTheme(this.themeId);
    this.audioData = createAudioData();
    this.previousBrightness = 0;
    this.lastEnergy = 0;
    this.lastMeteorAt = -100;
    this.rippleIndex = 0;
    this.ripples = new Array(RIPPLE_COUNT).fill(null).map(makeRipple);
    this.clock = new THREE.Clock();
    this.tempMatrix = new THREE.Matrix4();
    this.tempPosition = new THREE.Vector3();
    this.tempQuaternion = new THREE.Quaternion();
    this.tempScale = new THREE.Vector3();
    this.minDistance = 5;
    this.maxDistance = 120;
    this.minPolarAngle = 0.28;
    this.maxPolarAngle = Math.PI / 2 - 0.1;
    this.autoRotateSpeed = 0.5;
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.defaultCameraDistance = Math.sqrt(88 * 88 + 76 * 76);
    this.cameraRadius = this.defaultCameraDistance;
    this.cameraAzimuth = Math.PI / 4;
    this.cameraPolar = Math.acos(76 / this.defaultCameraDistance);
    this.isPointerDragging = false;
    this.pointerMoved = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.disposed = false;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(1.6, global.devicePixelRatio || 1));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(this.theme.uBaseColor1.clone(), 30, 95);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220);
    this.updateCamera();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    this.scene.add(light);

    this.material = this.createMaterial();
    this.boxGeometry = new THREE.BoxGeometry(0.9, 1, 0.9);
    this.mesh = new THREE.InstancedMesh(this.boxGeometry, this.material, this.count);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.positionInstances();

    this.meteorGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
    this.meteorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.meteorMesh = new THREE.InstancedMesh(this.meteorGeometry, this.meteorMaterial, MAX_METEORS);
    this.meteorMesh.frustumCulled = false;
    this.scene.add(this.meteorMesh);
    this.meteors = new Array(MAX_METEORS).fill(null).map(function () {
      return { active: false, x: 0, y: -1000, z: 0, speed: 0, strength: 0 };
    });
    this.meteorIndex = 0;

    this.particleGeometry = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    this.particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.particleMesh = new THREE.InstancedMesh(this.particleGeometry, this.particleMaterial, MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    this.particles = new Array(MAX_PARTICLES).fill(null).map(function () {
      return { active: false, x: 0, y: -1000, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, scale: 1 };
    });
    this.particleIndex = 0;

    var self = this;
    this.handlePointerDown = function (event) {
      self.pressStartedAt = performance.now();
      self.lastPointer = self.screenToWorld(event);
      self.isPointerDragging = true;
      self.pointerMoved = false;
      self.lastPointerX = event.clientX;
      self.lastPointerY = event.clientY;
      if (self.pointerTarget.setPointerCapture && typeof event.pointerId === 'number') {
        self.pointerTarget.setPointerCapture(event.pointerId);
      }
    };
    this.handlePointerMove = function (event) {
      if (!self.isPointerDragging) return;
      var dx = event.clientX - self.lastPointerX;
      var dy = event.clientY - self.lastPointerY;
      self.lastPointerX = event.clientX;
      self.lastPointerY = event.clientY;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
      self.pointerMoved = self.pointerMoved || Math.abs(dx) + Math.abs(dy) > 3;
      self.cameraAzimuth -= dx * 0.005;
      self.cameraPolar = clampNumber(
        self.cameraPolar + dy * 0.0045,
        self.minPolarAngle,
        self.maxPolarAngle
      );
      self.updateCamera();
    };
    this.handlePointerUp = function (event) {
      self.isPointerDragging = false;
      if (self.pointerTarget.releasePointerCapture && typeof event.pointerId === 'number') {
        try {
          self.pointerTarget.releasePointerCapture(event.pointerId);
        } catch (_) {}
      }
      if (self.pointerMoved) return;
      var point = self.screenToWorld(event) || self.lastPointer;
      if (!point) return;
      var duration = performance.now() - (self.pressStartedAt || performance.now());
      self.addRipple(point.x, point.z, Math.min(0.2 + (duration / 1000) * 2.8, 3.0), false);
    };
    this.handlePointerCancel = function () {
      self.isPointerDragging = false;
    };
    this.handleWheel = function (event) {
      event.preventDefault();
      self.zoom(event.deltaY);
      self.updateCamera();
    };
    this.pointerTarget = this.canvas.closest ? (this.canvas.closest('.mb-immersive__bg') || this.canvas) : this.canvas;
    this.wheelTarget = this.canvas.closest ? (this.canvas.closest('.mb-immersive__bg') || this.canvas) : this.canvas;
    this.pointerTarget.addEventListener('pointerdown', this.handlePointerDown);
    this.pointerTarget.addEventListener('pointermove', this.handlePointerMove);
    this.pointerTarget.addEventListener('pointerup', this.handlePointerUp);
    this.pointerTarget.addEventListener('pointercancel', this.handlePointerCancel);
    this.wheelTarget.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  SonicTopographyScene.prototype.createMaterial = function () {
    var uniforms = {
      uTime: { value: 0 },
      uSubBass: { value: 0 },
      uBass: { value: 0 },
      uLowMid: { value: 0 },
      uMid: { value: 0 },
      uHighMid: { value: 0 },
      uPresence: { value: 0 },
      uBrilliance: { value: 0 },
      uAir: { value: 0 },
      uWarmth: { value: 0 },
      uBrightness: { value: 0 },
      uSharpness: { value: 0 },
      uSmoothness: { value: 0 },
      uDensity: { value: 0 },
      uSpectralCentroid: { value: 0 },
      uEnergy: { value: 0 },
      uRipples: { value: this.ripples },
      uBaseColor1: { value: this.theme.uBaseColor1.clone() },
      uBaseColor2: { value: this.theme.uBaseColor2.clone() },
      uCoolCore: { value: this.theme.uCoolCore.clone() },
      uCoolEdge: { value: this.theme.uCoolEdge.clone() },
      uWarmCore: { value: this.theme.uWarmCore.clone() },
      uWarmEdge: { value: this.theme.uWarmEdge.clone() },
      uRippleColor: { value: this.theme.uRippleColor.clone() },
      uGlowIntensity: { value: this.theme.uGlowIntensity }
    };

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: true
    });
  };

  SonicTopographyScene.prototype.positionInstances = function () {
    var offset = (this.gridSize * this.spacing) / 2;
    var index = 0;
    for (var x = 0; x < this.gridSize; x++) {
      for (var z = 0; z < this.gridSize; z++) {
        var px = x * this.spacing - offset;
        var pz = z * this.spacing - offset;
        this.tempMatrix.makeTranslation(px, 0.5, pz);
        this.mesh.setMatrixAt(index, this.tempMatrix);
        index++;
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  };

  SonicTopographyScene.prototype.resize = function () {
    if (this.disposed) return;
    var rect = this.canvas.getBoundingClientRect();
    var width = Math.max(1, Math.floor(rect.width || this.canvas.clientWidth || 1));
    var height = Math.max(1, Math.floor(rect.height || this.canvas.clientHeight || 1));
    if (this.canvas.width !== Math.floor(width * this.renderer.getPixelRatio())
      || this.canvas.height !== Math.floor(height * this.renderer.getPixelRatio())) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  };

  SonicTopographyScene.prototype.updateAudioData = function (spectrum, isPlaying) {
    var derived = deriveAudioDataFromSpectrum(spectrum, this.audioData, this.previousBrightness);
    var raw = derived.raw;
    this.previousBrightness = derived.brightness;
    this.audioData.__bins = derived.bins;

    var dt = isPlaying && raw.energy > 0 ? 0.15 : 0.055;
    Object.keys(raw).forEach(function (key) {
      this.audioData[key] += (raw[key] - this.audioData[key]) * dt;
    }, this);

    var energyRise = this.audioData.energy - this.lastEnergy;
    if (energyRise > 0.018) {
      var angle = Math.random() * Math.PI * 2;
      var dist = Math.random() * 25;
      this.addRipple(Math.cos(angle) * dist, Math.sin(angle) * dist, Math.min(energyRise * 42, 4.0), false);
    }
    var now = this.clock.getElapsedTime();
    if (this.audioData.brilliance > 0.16 && now - this.lastMeteorAt > 4.0) {
      this.lastMeteorAt = now;
      this.addMeteor(Math.min(1.6, this.audioData.brilliance * 4));
    }
    this.lastEnergy = this.audioData.energy;
  };

  SonicTopographyScene.prototype.applyThemeNow = function (theme) {
    var target = theme || this.targetTheme || this.theme;
    if (!target || !this.material || !this.material.uniforms) return;
    var uniforms = this.material.uniforms;
    uniforms.uBaseColor1.value.copy(target.uBaseColor1);
    uniforms.uBaseColor2.value.copy(target.uBaseColor2);
    uniforms.uCoolCore.value.copy(target.uCoolCore);
    uniforms.uCoolEdge.value.copy(target.uCoolEdge);
    uniforms.uWarmCore.value.copy(target.uWarmCore);
    uniforms.uWarmEdge.value.copy(target.uWarmEdge);
    uniforms.uRippleColor.value.copy(target.uRippleColor);
    uniforms.uGlowIntensity.value = target.uGlowIntensity;
    this.theme.uBaseColor1.copy(target.uBaseColor1);
    this.theme.uBaseColor2.copy(target.uBaseColor2);
    this.theme.uCoolCore.copy(target.uCoolCore);
    this.theme.uCoolEdge.copy(target.uCoolEdge);
    this.theme.uWarmCore.copy(target.uWarmCore);
    this.theme.uWarmEdge.copy(target.uWarmEdge);
    this.theme.uRippleColor.copy(target.uRippleColor);
    this.theme.uGlowIntensity = target.uGlowIntensity;
    if (this.scene && this.scene.fog) {
      this.scene.fog.color.copy(target.uBaseColor1);
    }
  };

  SonicTopographyScene.prototype.setTheme = function (themeId) {
    var nextTheme = SONIC_THEMES[themeId] || SONIC_THEMES.nocturnal;
    this.themeId = nextTheme.id;
    this.targetTheme = cloneTheme(nextTheme);
    this.applyThemeNow(this.targetTheme);
    return this.getTheme();
  };

  SonicTopographyScene.prototype.nextTheme = function () {
    var index = SONIC_THEME_ORDER.indexOf(this.themeId);
    var nextTheme = SONIC_THEME_ORDER[(index + 1) % SONIC_THEME_ORDER.length];
    return this.setTheme(nextTheme);
  };

  SonicTopographyScene.prototype.getTheme = function () {
    var theme = SONIC_THEMES[this.themeId] || SONIC_THEMES.nocturnal;
    return { id: theme.id, name: theme.name };
  };

  SonicTopographyScene.prototype.zoom = function (delta) {
    var scale = delta > 0 ? 1.08 : 0.92;
    this.cameraRadius = clampNumber(this.cameraRadius * scale, this.minDistance, this.maxDistance);
    return this.cameraRadius;
  };

  SonicTopographyScene.prototype.updateCamera = function () {
    var sinPolar = Math.sin(this.cameraPolar);
    this.camera.position.set(
      this.cameraTarget.x + Math.sin(this.cameraAzimuth) * sinPolar * this.cameraRadius,
      this.cameraTarget.y + Math.cos(this.cameraPolar) * this.cameraRadius,
      this.cameraTarget.z + Math.cos(this.cameraAzimuth) * sinPolar * this.cameraRadius
    );
    this.camera.lookAt(this.cameraTarget);
  };

  SonicTopographyScene.prototype.applyThemeUniforms = function (delta) {
    var target = this.targetTheme || this.theme;
    var uniforms = this.material.uniforms;
    var lerpAmount = Math.min(1, delta * 3.0);
    uniforms.uBaseColor1.value.lerp(target.uBaseColor1, lerpAmount);
    uniforms.uBaseColor2.value.lerp(target.uBaseColor2, lerpAmount);
    uniforms.uCoolCore.value.lerp(target.uCoolCore, lerpAmount);
    uniforms.uCoolEdge.value.lerp(target.uCoolEdge, lerpAmount);
    uniforms.uWarmCore.value.lerp(target.uWarmCore, lerpAmount);
    uniforms.uWarmEdge.value.lerp(target.uWarmEdge, lerpAmount);
    uniforms.uRippleColor.value.lerp(target.uRippleColor, lerpAmount);
    uniforms.uGlowIntensity.value += (target.uGlowIntensity - uniforms.uGlowIntensity.value) * lerpAmount;
    this.theme.uBaseColor1.copy(uniforms.uBaseColor1.value);
    this.theme.uBaseColor2.copy(uniforms.uBaseColor2.value);
    this.theme.uCoolCore.copy(uniforms.uCoolCore.value);
    this.theme.uCoolEdge.copy(uniforms.uCoolEdge.value);
    this.theme.uWarmCore.copy(uniforms.uWarmCore.value);
    this.theme.uWarmEdge.copy(uniforms.uWarmEdge.value);
    this.theme.uRippleColor.copy(uniforms.uRippleColor.value);
    this.theme.uGlowIntensity = uniforms.uGlowIntensity.value;
    if (this.scene.fog) {
      this.scene.fog.color.lerp(target.uBaseColor1, lerpAmount);
    }
  };

  SonicTopographyScene.prototype.applyUniforms = function () {
    var data = this.audioData;
    var uniforms = this.material.uniforms;
    uniforms.uTime.value = this.clock.getElapsedTime();
    uniforms.uBass.value = data.bass;
    uniforms.uMid.value = data.mid;
    uniforms.uSubBass.value = data.subBass;
    uniforms.uLowMid.value = data.lowMid;
    uniforms.uHighMid.value = data.highMid;
    uniforms.uPresence.value = data.presence;
    uniforms.uBrilliance.value = data.brilliance;
    uniforms.uAir.value = data.air;
    uniforms.uWarmth.value = data.warmth;
    uniforms.uBrightness.value = data.brightness;
    uniforms.uSharpness.value = data.sharpness;
    uniforms.uSmoothness.value = data.smoothness;
    uniforms.uDensity.value = data.density;
    uniforms.uSpectralCentroid.value = data.spectralCentroid;
    uniforms.uEnergy.value = data.energy;
    uniforms.uRipples.value = this.ripples;
  };

  SonicTopographyScene.prototype.render = function () {
    if (this.disposed) return;
    var delta = Math.min(0.05, this.clock.getDelta());
    this.resize();
    this.applyUniforms();
    this.applyThemeUniforms(delta);
    this.updateMeteors(delta);
    this.updateParticles(delta);
    if (!this.isPointerDragging) {
      this.cameraAzimuth += delta * this.autoRotateSpeed * 0.08;
    }
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  };

  SonicTopographyScene.prototype.addRipple = function (x, z, strength, isWhite) {
    var ripple = this.ripples[this.rippleIndex];
    ripple.pos.set(x, z);
    ripple.time = this.clock.getElapsedTime();
    ripple.strength = strength;
    ripple.isActive = 1;
    ripple.rippleType = isWhite ? 1 : 0;
    this.rippleIndex = (this.rippleIndex + 1) % RIPPLE_COUNT;
  };

  SonicTopographyScene.prototype.addMeteor = function (strength) {
    var angle = Math.random() * Math.PI * 2;
    var dist = Math.random() * 25;
    var x = Math.cos(angle) * dist;
    var z = Math.sin(angle) * dist;
    this.addRipple(x, z, Math.min(strength, 1.2), true);
    for (var pIndex = 0; pIndex < 6; pIndex++) {
      this.spawnParticle(x, 0.5, z, 0.8 + strength * 0.4);
    }
  };

  SonicTopographyScene.prototype.spawnParticle = function (x, y, z, speedMultiplier) {
    var p = this.particles[this.particleIndex];
    p.active = true;
    p.x = x + (Math.random() - 0.5) * 1.5;
    p.y = y + (Math.random() - 0.5) * 1.5;
    p.z = z + (Math.random() - 0.5) * 1.5;
    p.vx = (Math.random() - 0.5) * 2.0;
    p.vy = Math.random() * 1.2 + speedMultiplier * 2.4;
    p.vz = (Math.random() - 0.5) * 2.0;
    p.life = 0;
    p.maxLife = 0.3 + Math.random() * 0.25;
    p.scale = Math.random() * 0.35 + 0.16;
    this.particleIndex = (this.particleIndex + 1) % MAX_PARTICLES;
  };

  SonicTopographyScene.prototype.updateMeteors = function (delta) {
    var white = new THREE.Color(0xffffff);
    var meteorColor = this.theme.uWarmCore.clone().lerp(white, 0.7);
    this.meteorMaterial.color.lerp(meteorColor, Math.min(1, delta * 3));

    for (var i = 0; i < MAX_METEORS; i++) {
      var m = this.meteors[i];
      if (!m.active) {
        this.tempPosition.set(0, -1000, 0);
        this.tempScale.set(0, 0, 0);
      } else {
        m.y -= m.speed * 60 * delta;
        if (m.y <= 0) {
          m.active = false;
          this.addRipple(m.x, m.z, Math.min(m.strength, 1.2), true);
          for (var pIndex = 0; pIndex < 10; pIndex++) {
            this.spawnParticle(m.x, 0.5, m.z, m.speed * 1.5);
          }
        }
        this.tempPosition.set(m.x, Math.max(0, m.y), m.z);
        this.tempScale.set(1.5, 1.5, 1.5);
      }
      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.meteorMesh.setMatrixAt(i, this.tempMatrix);
    }
    this.meteorMesh.instanceMatrix.needsUpdate = true;
  };

  SonicTopographyScene.prototype.updateParticles = function (delta) {
    this.particleMaterial.color.copy(this.meteorMaterial.color);
    for (var i = 0; i < MAX_PARTICLES; i++) {
      var p = this.particles[i];
      if (!p.active) {
        this.tempPosition.set(0, -1000, 0);
        this.tempScale.set(0, 0, 0);
      } else {
        p.life += delta;
        if (p.life >= p.maxLife) {
          p.active = false;
          this.tempScale.set(0, 0, 0);
        } else {
          p.x += p.vx * delta * 10;
          p.y += p.vy * delta * 10;
          p.z += p.vz * delta * 10;
          var scale = p.scale * (1.0 - (p.life / p.maxLife));
          this.tempPosition.set(p.x, p.y, p.z);
          this.tempScale.set(scale, scale, scale);
        }
      }
      this.tempMatrix.compose(this.tempPosition, this.tempQuaternion, this.tempScale);
      this.particleMesh.setMatrixAt(i, this.tempMatrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  };

  SonicTopographyScene.prototype.screenToWorld = function (event) {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var point = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, point) ? point : null;
  };

  SonicTopographyScene.prototype.dispose = function () {
    if (this.disposed) return;
    this.disposed = true;
    this.pointerTarget.removeEventListener('pointerdown', this.handlePointerDown);
    this.pointerTarget.removeEventListener('pointermove', this.handlePointerMove);
    this.pointerTarget.removeEventListener('pointerup', this.handlePointerUp);
    this.pointerTarget.removeEventListener('pointercancel', this.handlePointerCancel);
    this.wheelTarget.removeEventListener('wheel', this.handleWheel);
    this.scene.remove(this.mesh);
    this.scene.remove(this.meteorMesh);
    this.scene.remove(this.particleMesh);
    this.boxGeometry.dispose();
    this.meteorGeometry.dispose();
    this.particleGeometry.dispose();
    this.material.dispose();
    this.meteorMaterial.dispose();
    this.particleMaterial.dispose();
    this.renderer.dispose();
  };

  SonicTopographyScene.deriveAudioDataFromSpectrum = deriveAudioDataFromSpectrum;
  global.MBSonicTopographyScene = SonicTopographyScene;
})(window);
