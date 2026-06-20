const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'build', 'icons', 'icon.ico');
const targets = [
    path.join(root, 'src', 'renderer', 'src', 'assets', 'images', 'favicon.ico'),
    path.join(root, 'src', 'renderer', 'public', 'assets', 'images', 'favicon.ico')
];

async function main() {
    await fs.promises.access(sourcePath);

    for (const targetPath of targets) {
        await fs.promises.mkdir(path.dirname(targetPath), {recursive: true});
        await fs.promises.copyFile(sourcePath, targetPath);
    }

    console.log(`Synced Auralux favicon assets from ${path.relative(root, sourcePath)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
