# Auralux

Auralux is an immersive desktop music player for local libraries and personal cloud music accounts.

It is based on MusicBox by asxez and keeps the original MIT license notice in this repository.

## Features

- Local music library playback.
- Immersive player with dynamic image or video backgrounds.
- Lyrics display and desktop lyrics.
- NetEase Cloud Music integration layer for personal account playback and playlist import.
- WASAPI and WebAudio playback paths.
- Playlist management, metadata, cover display, and playback queue.

## Development

```bash
npm install
npm run install:renderer
npm run install:rs
pip install -r requirements.txt
npm run dev
```

## Build

```bash
npm run build
```

## License And Notices

Auralux contains modified code from MusicBox by asxez, licensed under the MIT License.

See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

The NetEase integration layer uses [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) by binaryify as a local API service under the MIT License.

NetEase Cloud Music integration is intended for users to access their own accounts. This project does not provide music content and is not affiliated with NetEase Cloud Music.
