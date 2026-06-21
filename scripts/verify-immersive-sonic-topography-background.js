const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const immersiveView = read('src/renderer/ui-next-static/components/ImmersivePlayerView.js');
const shell = read('src/renderer/ui-next-static/NewMusicShell.js');
const adapter = read('src/renderer/src/ui-next/UINextMusicBoxAdapter.ts');
const styles = read('src/renderer/ui-next-static/styles.css');
const qualityGate = read('scripts/verify-auralux-stage35-quality-gate.js');
const bootstrap = read('src/renderer/src/ui-next/bootstrap.ts');
const packageJson = JSON.parse(read('src/renderer/package.json'));
const sonicScene = fs.existsSync(path.join(root, 'src/renderer/ui-next-static/sonicTopographyScene.js'))
  ? read('src/renderer/ui-next-static/sonicTopographyScene.js')
  : '';
const visualizerLabelsMatch = immersiveView.match(/var\s+VISUALIZER_LABELS\s*=\s*\{([\s\S]*?)\};/);
const visualizerStylesMatch = immersiveView.match(/function\s+renderVisualizerSwitch[\s\S]*?var\s+styles\s*=\s*\[([^\]]*)\]/);

assert(
  visualizerLabelsMatch && !visualizerLabelsMatch[1].includes('topography'),
  'Sonic Topography must not be registered as an immersive pickup visualizer style.'
);
assert(
  visualizerStylesMatch && !visualizerStylesMatch[1].includes('topography'),
  'Immersive pickup style switch must not include topography.'
);
assert(
  !/type\s+UINextImmersiveVisualizerStyle\s*=[^;]*topography/.test(adapter),
  'Persistent immersive visualizer style union must not include topography.'
);
assert(
  !qualityGate.includes('verify-immersive-sonic-topography-visualizer.js'),
  'Aggregate quality gate must not include the old wrong pickup-style Sonic guard.'
);

assert(
  /type\s+UINextImmersiveBackgroundType\s*=[^;]*sonic-topography/.test(adapter),
  'Immersive background type must include sonic-topography.'
);
assert(
  /useSonicTopographyImmersiveBackground\s*\(\)/.test(adapter),
  'Adapter must expose useSonicTopographyImmersiveBackground().'
);
assert(
  /backgroundType:\s*'sonic-topography'/.test(adapter),
  'Adapter must persist sonic-topography as the immersive background type.'
);
assert(
  /openImmersivePlayer\s*\([^)]*\)\s*:\s*void\s*\{[\s\S]*loadImmersiveSettingsSnapshot\s*\(\s*\{\s*resetSonicBackground:\s*true\s*\}\s*\)/.test(adapter),
  'Every immersive entry must reset Sonic Topography to the default theme before rendering.'
);
assert(
  /resetSonicBackground/.test(adapter)
    && /settings\.backgroundType\s*===\s*'sonic-topography'[\s\S]*\?\s*'cover'/.test(adapter),
  'Loading immersive settings must suppress persisted Sonic Topography on entry without deleting the saved setting.'
);
assert(
  /onBackgroundSonicTopography/.test(immersiveView) && /onBackgroundSonicTopography/.test(shell),
  'Immersive background actions must wire an onBackgroundSonicTopography callback.'
);
const regularBackgroundMatch = immersiveView.match(/function\s+renderRegularBackgroundActions[\s\S]*?\n  function\s+renderSonicBackgroundActions/);
const sonicBackgroundMatch = immersiveView.match(/function\s+renderSonicBackgroundActions[\s\S]*?\n  function\s+renderCachedVideos/);
assert(
  /backgroundPanelMode/.test(immersiveView)
    && /mb-immersive__bg-tabs/.test(immersiveView)
    && /renderRegularBackgroundActions/.test(immersiveView)
    && /renderSonicBackgroundActions/.test(immersiveView),
  'Immersive style panel must split background settings into regular and Sonic versions.'
);
assert(
  regularBackgroundMatch
    && /onBackgroundCover/.test(regularBackgroundMatch[0])
    && /onBackgroundImage/.test(regularBackgroundMatch[0])
    && /onBackgroundVideo/.test(regularBackgroundMatch[0])
    && /onBackgroundImport/.test(regularBackgroundMatch[0])
    && !/onBackgroundSonicTopography/.test(regularBackgroundMatch[0]),
  'Regular background panel must contain cover/image/video/import controls without Sonic activation.'
);
assert(
  sonicBackgroundMatch
    && /onBackgroundSonicTopography/.test(sonicBackgroundMatch[0])
    && /onCycleSonicTheme/.test(sonicBackgroundMatch[0])
    && /data-sonic-theme-name/.test(sonicBackgroundMatch[0])
    && !/onBackgroundImport/.test(sonicBackgroundMatch[0]),
  'Sonic background panel must contain Sonic activation and palette controls without regular import controls.'
);
assert(
  /immersiveBackgroundPanelMode:\s*'regular'/.test(shell)
    && /backgroundPanelMode:\s*s\.immersiveBackgroundPanelMode/.test(shell)
    && /onBackgroundPanelMode/.test(shell),
  'Immersive shell must keep the style panel on the regular background version by default.'
);
assert(
  /panelMode\s*===\s*'regular'[\s\S]*renderCachedVideos/.test(immersiveView),
  'Imported image/video cache list must only render in the regular background panel.'
);
assert(
  /background\.type\s*===\s*'sonic-topography'/.test(immersiveView),
  'renderBackground() must branch on sonic-topography.'
);
assert(
  /data-sonic-topography-canvas/.test(immersiveView) && /mb-immersive__sonic-canvas/.test(immersiveView),
  'renderBackground() must render a Sonic Topography WebGL canvas.'
);
const sonicThemeMatch = immersiveView.match(/function\s+renderSonicTopographyTheme[\s\S]*?\n  function\s+renderSonicSeek/);
assert(
  sonicThemeMatch,
  'Sonic Topography background must render a dedicated immersive player theme branch.'
);
assert(
  /mb-immersive__sonic-player/.test(sonicThemeMatch[0])
    && /mb-immersive__sonic-lyrics/.test(sonicThemeMatch[0]),
  'Sonic Topography theme must include the ported player panel and lyrics surfaces.'
);
assert(
  /mb-immersive__sonic-queue/.test(sonicThemeMatch[0])
    && /onToggleQueue/.test(sonicThemeMatch[0])
    && /queueCount/.test(sonicThemeMatch[0]),
  'Sonic Topography player must expose a queue entry button in the right-top player panel.'
);
assert(
  /mb-immersive__sonic-theme-btn/.test(sonicThemeMatch[0])
    && /onCycleSonicTheme/.test(sonicThemeMatch[0])
    && /sonicThemeName/.test(sonicThemeMatch[0]),
  'Sonic Topography player must expose the original palette theme switch in the right-top player panel.'
);
assert(
  /queueCount:\s*s\.queue\.tracks\.length/.test(shell)
    && /queueOpen:\s*s\.queueOpen/.test(shell)
    && /onToggleQueue:\s*function\s*\(\)\s*\{\s*s\.queueOpen\s*=\s*!s\.queueOpen/.test(shell),
  'Immersive player must receive queue count/open state and a queue toggle callback.'
);
assert(
  /s\.view\s*===\s*'immersive-player'[\s\S]*this\._renderQueuePanel\(\)/.test(shell)
    && /NewMusicShell\.prototype\._renderQueuePanel[\s\S]*QueuePanel\(\{/.test(shell),
  'Immersive render branch must render the existing QueuePanel when the queue is open.'
);
assert(
  !/mb-immersive__sonic-stats/.test(immersiveView)
    && !/sonicStat/.test(immersiveView)
    && !/\.mb-immersive__sonic-stats/.test(styles)
    && !/\.mb-immersive__sonic-stat/.test(styles),
  'Sonic Topography theme must not render the removed Bass/Mid/Treble/Energy stats strip.'
);
assert(
  !/mb-immersive__visual/.test(sonicThemeMatch[0])
    && !/mb-immersive__cover-wrap/.test(sonicThemeMatch[0])
    && !/mb-immersive__disc/.test(sonicThemeMatch[0])
    && !/renderWaveform/.test(sonicThemeMatch[0]),
  'Sonic Topography theme must not render the default Auralux cover, disc, or pickup bars.'
);
assert(
  !/mb-immersive__sonic-bg-tile/.test(immersiveView)
    && !/mb-immersive__sonic-bg-tile/.test(shell)
    && !/\.mb-immersive__sonic-bg-tile/.test(styles),
  'Immersive Sonic background must not use the rejected DOM tile imitation.'
);
assert(
  /_ensureImmersiveSonicBackgroundLoop/.test(shell)
    && /_ensureImmersiveSonicScene/.test(shell)
    && /_destroyImmersiveSonicScene/.test(shell)
    && /getFrequencySpectrum/.test(shell)
    && /updateAudioData/.test(shell),
  'Shell must create and drive the Sonic Topography scene from the frequency spectrum.'
);
assert(
  /immersiveSonicTheme/.test(shell)
    && /onCycleSonicTheme/.test(shell)
    && /scene\.setTheme/.test(shell)
    && /scene\.getTheme/.test(shell),
  'Shell must keep Sonic Topography theme state in sync with the scene and palette button.'
);
assert(
  /\.mb-immersive__sonic-canvas/.test(styles)
    && !/--immersive-sonic-height/.test(styles),
  'Styles must define the full-bleed Sonic WebGL canvas, not CSS height variables.'
);
assert(
  /\.mb-immersive--sonic-theme/.test(styles)
    && /\.mb-immersive__sonic-player/.test(styles)
    && /\.mb-immersive__lyrics--sonic/.test(styles),
  'Styles must define the Sonic Topography full immersive player theme.'
);
assert(
  bootstrap.includes("ui-next-static/sonicTopographyScene"),
  'UI-NEXT bootstrap must import the Sonic Topography scene module.'
);
assert(
  packageJson.dependencies && packageJson.dependencies.three,
  'Renderer package must depend on three for the Sonic Topography source port.'
);
assert(
  /from\s+['"]three['"]/.test(sonicScene)
    && /InstancedMesh/.test(sonicScene)
    && /ShaderMaterial/.test(sonicScene)
    && /BoxGeometry\s*\(\s*0\.9\s*,\s*1\s*,\s*0\.9\s*\)/.test(sonicScene),
  'Sonic scene must port the Three.js instanced box terrain source.'
);
assert(
  /SONIC_THEMES\s*=\s*\{/.test(sonicScene)
    && /nocturnal/.test(sonicScene)
    && /neon-tokyo/.test(sonicScene)
    && /cyber-forest/.test(sonicScene)
    && /minimal-monochrome/.test(sonicScene),
  'Sonic scene must port the original four color themes.'
);
assert(
  /SonicTopographyScene\.prototype\.setTheme/.test(sonicScene)
    && /SonicTopographyScene\.prototype\.nextTheme/.test(sonicScene)
    && /SonicTopographyScene\.prototype\.getTheme/.test(sonicScene),
  'Sonic scene must expose setTheme(), nextTheme(), and getTheme() for the immersive palette button.'
);
const setThemeMatch = sonicScene.match(/SonicTopographyScene\.prototype\.setTheme\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\n  \};/);
assert(
  /SonicTopographyScene\.prototype\.applyThemeNow/.test(sonicScene)
    && setThemeMatch
    && /applyThemeNow/.test(setThemeMatch[0])
    && /uBaseColor1\.value\.copy/.test(sonicScene)
    && /uRippleColor\.value\.copy/.test(sonicScene)
    && /scene\.fog\.color\.copy/.test(sonicScene),
  'Sonic palette clicks must immediately copy theme colors into shader uniforms and fog, not only set a lerp target.'
);
assert(
  /uBaseColor1\.value\.lerp/.test(sonicScene)
    && /uCoolCore\.value\.lerp/.test(sonicScene)
    && /uWarmCore\.value\.lerp/.test(sonicScene)
    && /uRippleColor\.value\.lerp/.test(sonicScene)
    && /uGlowIntensity\.value/.test(sonicScene),
  'Sonic scene must smoothly lerp shader color uniforms when themes change.'
);
assert(
  !/vec3\(0\.4,\s*0\.8,\s*1\.0\)/.test(sonicScene)
    && /mix\(targetGlow,\s*uRippleColor/.test(sonicScene),
  'Sonic shader brightness wash must follow the active theme instead of forcing every palette back to cyan.'
);
assert(
  /addEventListener\('wheel'/.test(sonicScene)
    && /preventDefault/.test(sonicScene)
    && /SonicTopographyScene\.prototype\.zoom/.test(sonicScene)
    && /cameraRadius/.test(sonicScene)
    && /minDistance\s*=\s*5/.test(sonicScene)
    && /maxDistance\s*=\s*120/.test(sonicScene),
  'Sonic scene must port original OrbitControls-style mouse wheel zoom limits.'
);
assert(
  /cameraTarget\s*=\s*new\s+THREE\.Vector3\(\s*0\s*,\s*0\s*,\s*0\s*\)/.test(sonicScene)
    && /cameraRadius/.test(sonicScene)
    && /cameraAzimuth/.test(sonicScene)
    && /cameraPolar/.test(sonicScene)
    && /maxPolarAngle\s*=\s*Math\.PI\s*\/\s*2\s*-\s*0\.1/.test(sonicScene),
  'Sonic scene camera must use OrbitControls-style spherical state: target, radius, azimuth, polar, and maxPolarAngle.'
);
const updateCameraMatch = sonicScene.match(/SonicTopographyScene\.prototype\.updateCamera\s*=\s*function\s*\(\)\s*\{[\s\S]*?\n  \};/);
assert(
  updateCameraMatch
    && /Math\.sin\(this\.cameraPolar\)/.test(updateCameraMatch[0])
    && /Math\.cos\(this\.cameraPolar\)/.test(updateCameraMatch[0])
    && /Math\.sin\(this\.cameraAzimuth\)/.test(updateCameraMatch[0])
    && /Math\.cos\(this\.cameraAzimuth\)/.test(updateCameraMatch[0])
    && /this\.camera\.lookAt\(this\.cameraTarget\)/.test(updateCameraMatch[0]),
  'Sonic scene must update camera position from spherical orbit coordinates, not fixed camera Y.'
);
assert(
  /handlePointerMove/.test(sonicScene)
    && /addEventListener\('pointermove'/.test(sonicScene)
    && /removeEventListener\('pointermove'/.test(sonicScene)
    && /cameraAzimuth\s*[+\-]=/.test(sonicScene)
    && /cameraPolar\s*=\s*clampNumber\([\s\S]*(?:this|self)\.maxPolarAngle/.test(sonicScene),
  'Sonic scene drag must rotate/orbit the camera with maxPolarAngle instead of only adding a ripple.'
);
assert(
  /pointerTarget\s*=\s*this\.canvas\.closest\s*\?\s*\(this\.canvas\.closest\('\.mb-immersive__bg'\)/.test(sonicScene)
    && /pointerTarget\.addEventListener\('pointerdown'/.test(sonicScene)
    && /pointerTarget\.addEventListener\('pointermove'/.test(sonicScene)
    && /pointerTarget\.removeEventListener\('pointermove'/.test(sonicScene),
  'Sonic drag must bind the full immersive background hit area, not only the canvas hidden under overlay layers.'
);
assert(
  /closest\('\.mb-immersive__bg'\)/.test(sonicScene)
    && /wheelTarget\.addEventListener\('wheel'/.test(sonicScene)
    && /wheelTarget\.removeEventListener\('wheel'/.test(sonicScene),
  'Sonic scene wheel zoom must bind the full immersive background hit area, because shade/grain layers sit above the canvas.'
);
assert(
  /defaultCameraDistance\s*=/.test(sonicScene)
    && /cameraRadius\s*=\s*this\.defaultCameraDistance/.test(sonicScene)
    && !/cameraRadius\s*=\s*clampNumber\(this\.cameraOrbitRadius,\s*this\.minDistance,\s*this\.maxDistance\)/.test(sonicScene),
  'Sonic scene initial camera distance must not be clamped to maxDistance, otherwise mouse wheel zoom appears inert.'
);
assert(
  /this\._syncImmersiveSonicTheme\(this\._immersiveSonicScene\)/.test(shell)
    && !/if\s*\(this\._immersiveSonicScene\s*&&\s*this\._immersiveSonicCanvas\s*===\s*canvas\)\s*\{[\s\S]{0,180}this\._syncImmersiveSonicTheme/.test(shell),
  'Sonic scene must not call setTheme() every frame when reusing the same scene, otherwise palette color lerp keeps resetting.'
);
const cycleThemeMatch = shell.match(/NewMusicShell\.prototype\._cycleImmersiveSonicTheme\s*=\s*function\s*\(\)\s*\{[\s\S]*?\n  \};/);
assert(
  cycleThemeMatch && !/this\.render\(\)/.test(cycleThemeMatch[0]),
  'Sonic palette click must not call this.render(), because recreating the shell replaces the live WebGL canvas instead of lerping the existing scene.'
);
assert(
  /data-sonic-theme-name/.test(immersiveView)
    && /sonicThemeName:\s*this\.root\.querySelector\('\[data-sonic-theme-name\]'\)/.test(shell)
    && /sonicThemeNames:\s*this\.root\.querySelectorAll\('\[data-sonic-theme-name\]'\)/.test(shell)
    && /NewMusicShell\.prototype\._updateImmersiveSonicThemeLabel/.test(shell)
    && /sonicThemeNames\.forEach/.test(shell)
    && /sonicThemeName\.textContent/.test(shell),
  'Sonic theme labels must update in place across the player and style panel so palette changes keep the same WebGL scene alive.'
);
assert(
  /gridSize\s*=\s*160/.test(sonicScene)
    && /spacing\s*=\s*1\.05/.test(sonicScene)
    && /count\s*=\s*this\.gridSize\s*\*\s*this\.gridSize/.test(sonicScene),
  'Sonic scene must preserve the source grid size and spacing.'
);
assert(
  /particleGeometry\s*=\s*new\s+THREE\.BoxGeometry\(\s*0\.[0-3]\d*\s*,\s*0\.[0-3]\d*\s*,\s*0\.[0-3]\d*\s*\)/.test(sonicScene)
    && /particleMaterial\s*=\s*new\s+THREE\.MeshBasicMaterial\(\{[\s\S]*opacity:\s*0\.[0-3]\d*[\s\S]*depthWrite:\s*false[\s\S]*blending:\s*THREE\.AdditiveBlending/.test(sonicScene)
    && !/spawnParticle\(m\.x,\s*m\.y,\s*m\.z/.test(sonicScene),
  'Sonic meteor particles must not render as large dark sky clumps; keep particles small/additive and do not spawn airborne trail blocks.'
);
const addMeteorMatch = sonicScene.match(/SonicTopographyScene\.prototype\.addMeteor\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\n  \};/);
assert(
  addMeteorMatch
    && /this\.addRipple\(/.test(addMeteorMatch[0])
    && !/meteor\.active\s*=\s*true/.test(addMeteorMatch[0])
    && !/meteor\.y\s*=\s*30/.test(addMeteorMatch[0]),
  'Sonic meteor highlights must resolve as ground ripples in Auralux, not visible falling sky pillars.'
);
assert(
  /uSubBass/.test(sonicScene)
    && /uBass/.test(sonicScene)
    && /uLowMid/.test(sonicScene)
    && /uMid/.test(sonicScene)
    && /uHighMid/.test(sonicScene)
    && /uPresence/.test(sonicScene)
    && /uBrilliance/.test(sonicScene)
    && /uAir/.test(sonicScene)
    && /uRipples/.test(sonicScene),
  'Sonic scene must port the original audio band and ripple shader uniforms.'
);
assert(
  !/uTime\s*\*\s*40\.0/.test(sonicScene)
    && !/rnd\s*\*\s*89\.0\s*\+\s*uTime/.test(sonicScene)
    && /cleanDetailFade/.test(sonicScene)
    && /topIntensity\s*\+=\s*uAir\s*\*\s*0\.[0-8]/.test(sonicScene)
    && /currentGlow\s*\*\s*edge\s*\*\s*0\.[0-4]/.test(sonicScene),
  'Sonic shader must avoid high-frequency sparkle/edge flicker that makes distant terrain look dirty.'
);
assert(
  /deriveAudioDataFromSpectrum/.test(sonicScene)
    && /i\s*<=\s*1[\s\S]*subBass/.test(sonicScene)
    && /i\s*<=\s*372[\s\S]*air/.test(sonicScene)
    && /spectralCentroid/.test(sonicScene),
  'Sonic scene must derive AudioEngine-style bands from the Auralux spectrum.'
);
assert(
  qualityGate.includes('verify-immersive-sonic-topography-background.js'),
  'Aggregate quality gate must include the correct Sonic background guard.'
);

console.log('verify-immersive-sonic-topography-background: ok');

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function websocketDataToText(data) {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (data && typeof data.arrayBuffer === 'function') {
    return Buffer.from(await data.arrayBuffer()).toString('utf8');
  }
  return Buffer.from(data).toString('utf8');
}

async function evaluateInCdp(expression) {
  if (typeof WebSocket !== 'function') {
    throw new Error('Runtime pixel check requires Node.js WebSocket support.');
  }
  const targets = await getJson('http://127.0.0.1:9223/json/list');
  const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
  assert(page, 'No Electron CDP page target found at 127.0.0.1:9223.');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', async (event) => {
    const message = JSON.parse(await websocketDataToText(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      handlers.reject(new Error(JSON.stringify(message.error)));
    } else {
      handlers.resolve(message.result);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  function send(method, params = {}) {
    const messageId = ++id;
    ws.send(JSON.stringify({ id: messageId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(messageId, { resolve, reject });
    });
  }

  try {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true
    });
    return result.result && result.result.value;
  } finally {
    ws.close();
  }
}

async function verifyRuntimePixels() {
  const result = await evaluateInCdp(`(() => {
    try {
      const shell = window.__newShell;
      if (!shell) return { ok: false, error: 'window.__newShell missing' };
      shell.state.view = 'immersive-player';
      shell.state.immersiveBackground = { type: 'sonic-topography', src: '' };
      shell.state.isPlaying = true;
      shell.render();

      const canvas = document.querySelector('[data-sonic-topography-canvas]');
      const scene = canvas && shell._ensureImmersiveSonicScene
        ? shell._ensureImmersiveSonicScene(canvas)
        : null;
      if (!canvas || !scene) {
        return {
          ok: false,
          error: 'Sonic canvas or scene missing',
          hasCanvas: Boolean(canvas),
          hasScene: Boolean(scene),
          hasSceneGlobal: Boolean(window.MBSonicTopographyScene)
        };
      }

      const spectrum = Array.from({ length: 128 }, (_, index) => (
        0.08
        + Math.max(0, Math.sin(index * 0.18)) * 0.35
        + (index < 16 ? 0.45 : 0)
      ));
      for (let frame = 0; frame < 3; frame += 1) {
        scene.updateAudioData(spectrum, true);
        if (frame === 0) scene.addRipple(0, 0, 2.5, false);
        scene.render();
      }

      const gl = scene.renderer.getContext();
      const width = canvas.width;
      const height = canvas.height;
      let nonBlank = 0;
      let alphaSum = 0;
      let colorSum = 0;
      let maxAlpha = 0;
      let maxColor = 0;

      for (let yi = 0; yi < 24; yi += 1) {
        for (let xi = 0; xi < 24; xi += 1) {
          const x = Math.max(0, Math.min(width - 1, Math.floor((xi + 0.5) * width / 24)));
          const y = Math.max(0, Math.min(height - 1, Math.floor((yi + 0.5) * height / 24)));
          const pixel = new Uint8Array(4);
          gl.readPixels(x, height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          alphaSum += pixel[3];
          colorSum += pixel[0] + pixel[1] + pixel[2];
          maxAlpha = Math.max(maxAlpha, pixel[3]);
          maxColor = Math.max(maxColor, pixel[0], pixel[1], pixel[2]);
          if (pixel[3] > 0 || pixel[0] || pixel[1] || pixel[2]) {
            nonBlank += 1;
          }
        }
      }

      return {
        ok: nonBlank > 40 && alphaSum > 1000 && colorSum > 1000,
        nonBlank,
        alphaSum,
        colorSum,
        maxAlpha,
        maxColor,
        canvasWidth: width,
        canvasHeight: height,
        gridSize: scene.gridSize,
        spacing: scene.spacing,
        count: scene.count,
        hasInstancedMesh: Boolean(scene.mesh && scene.mesh.isInstancedMesh),
        hasShaderMaterial: Boolean(scene.material && scene.material.isShaderMaterial),
        drawCalls: scene.renderer.info.render.calls,
        triangles: scene.renderer.info.render.triangles,
        glError: gl.getError()
      };
    } catch (error) {
      return {
        ok: false,
        error: String(error),
        stack: error && error.stack
      };
    }
  })()`);

  assert(result && result.ok, `Sonic Topography runtime canvas must be nonblank. Result: ${JSON.stringify(result)}`);
  assert(result.gridSize === 160 && result.spacing === 1.05 && result.count === 25600, 'Runtime Sonic scene must preserve the original 160x160 grid.');
  assert(result.hasInstancedMesh && result.hasShaderMaterial, 'Runtime Sonic scene must use InstancedMesh and ShaderMaterial.');
  assert(result.drawCalls > 0 && result.triangles > 0 && result.glError === 0, 'Runtime Sonic WebGL render must issue draw calls without GL errors.');
  console.log(`verify-immersive-sonic-topography-background runtime: ok (${result.nonBlank} nonblank samples, ${result.triangles} triangles)`);
}

if (process.argv.includes('--runtime')) {
  verifyRuntimePixels().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
