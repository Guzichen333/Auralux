const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(content, needle, label) {
    if (!content.includes(needle)) {
        throw new Error(`${label} must include: ${needle}`);
    }
}

function assertIncludesNormalized(content, needle, label) {
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();

    if (!normalize(content).includes(normalize(needle))) {
        throw new Error(`${label} must include: ${needle}`);
    }
}

const readme = read('README.md');
const notice = read('NOTICE.md');
const auraluxLicense = read('AURALUX_LICENSE.md');
const mitLicense = read('LICENSE');

assertIncludes(readme, 'Auralux 采用双层授权说明', 'README Chinese license section');
assertIncludes(readme, 'Auralux uses a layered licensing model', 'README English license section');
assertIncludes(readme, 'source-available', 'README source availability wording');
assertIncludes(readme, 'Auralux Non-Commercial License', 'README non-commercial license link');
assertIncludes(readme, '原始 MusicBox 代码继续遵循 MIT License', 'README upstream MIT notice');
assertIncludes(readme, 'Commercial use, commercial distribution', 'README commercial restriction');
assertIncludes(readme, 'yin-yizhen/sonic-topography', 'README Sonic Topography attribution');
assertIncludes(readme, 'did not include an explicit license file or package-level license field', 'README Sonic Topography license caveat');

assertIncludes(notice, 'Auralux Non-Commercial License in AURALUX_LICENSE.md', 'NOTICE Auralux license reference');
assertIncludes(notice, 'Commercial use of Auralux-specific modifications is not permitted', 'NOTICE commercial restriction');
assertIncludesNormalized(notice, 'does not remove or limit rights granted by the original MusicBox MIT License', 'NOTICE upstream MIT boundary');
assertIncludes(notice, 'Sonic Topography by yin-yizhen', 'NOTICE Sonic Topography attribution');
assertIncludes(notice, 'https://github.com/yin-yizhen/sonic-topography', 'NOTICE Sonic Topography repository');
assertIncludes(notice, 'not a claim that the original repository is MIT-licensed', 'NOTICE Sonic Topography license caveat');

assertIncludes(auraluxLicense, '# Auralux Non-Commercial License', 'AURALUX_LICENSE title');
assertIncludes(auraluxLicense, 'This license applies only to Auralux-specific modifications', 'AURALUX_LICENSE scope');
assertIncludes(auraluxLicense, 'Original code from MusicBox by asxez remains licensed under the MIT License', 'AURALUX_LICENSE upstream boundary');
assertIncludes(auraluxLicense, 'Commercial use is not permitted without prior written permission', 'AURALUX_LICENSE commercial restriction');
assertIncludes(auraluxLicense, 'This license does not restrict rights granted by the original MusicBox MIT License', 'AURALUX_LICENSE compatibility notice');
assertIncludes(auraluxLicense, 'does not grant additional rights to that upstream', 'AURALUX_LICENSE Sonic Topography rights caveat');

assertIncludes(mitLicense, 'MIT License', 'LICENSE title');
assertIncludes(mitLicense, 'Copyright (c) 2025-present asxez', 'LICENSE upstream copyright');

console.log('Auralux license docs verification passed.');
