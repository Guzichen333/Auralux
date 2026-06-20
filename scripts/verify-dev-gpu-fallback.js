const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'main', 'core', 'Application.ts');
const source = fs.readFileSync(appPath, 'utf8');

function assertContains(value, needle, message) {
  if (!value.includes(needle)) {
    throw new Error(message);
  }
}

assertContains(source, 'AURALUX_DISABLE_HARDWARE_ACCELERATION', 'dev GPU fallback env var is missing');
assertContains(source, 'process.env.AURALUX_DISABLE_HARDWARE_ACCELERATION ===', 'dev GPU fallback must read an explicit env value');
assertContains(source, 'const shouldDisableHardwareAcceleration', 'hardware acceleration decision should be explicit');
assertContains(source, "app.commandLine.appendSwitch('disable-gpu')", 'dev GPU fallback must pass disable-gpu');
assertContains(source, "app.commandLine.appendSwitch('disable-gpu-compositing')", 'dev GPU fallback must pass disable-gpu-compositing');
assertContains(source, "app.commandLine.appendSwitch('disable-gpu-sandbox')", 'dev GPU fallback must pass disable-gpu-sandbox');
assertContains(source, "app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor')", 'dev GPU fallback must disable VizDisplayCompositor');
assertContains(source, 'app.disableHardwareAcceleration();', 'fallback must call Electron hardware acceleration disable before ready');

console.log('Dev GPU fallback guard passed.');
