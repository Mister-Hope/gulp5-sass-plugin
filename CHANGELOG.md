# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.4](https://github.com/Mister-Hope/gulp5-sass-plugin/compare/v2.0.3...v2.0.4) (2024-11-28)

### Bug Fixes

- **deps:** update dependency picocolors to v1.1.1 ([#859](https://github.com/Mister-Hope/gulp5-sass-plugin/issues/859)) ([0e67bd6](https://github.com/Mister-Hope/gulp5-sass-plugin/commit/0e67bd61dda8a9ab479bfc7a82eabdec55816751))
- **deps:** update dependency sass to v1.80.6 ([#841](https://github.com/Mister-Hope/gulp5-sass-plugin/issues/841)) ([eee2f7c](https://github.com/Mister-Hope/gulp5-sass-plugin/commit/eee2f7c3c7c69179dc03c51619c8130bff7ad34f))
- fix cjs require ([fe9a496](https://github.com/Mister-Hope/gulp5-sass-plugin/commit/fe9a49667a21e615058c33d6c5344e1b116b32d6))

## [3.1.1](https://github.com/Mister-Hope/gulp-sass/compare/v3.1.0...v3.1.1) (2022-11-01)

### Features

- stop bundling source files

## [3.1.0](https://github.com/Mister-Hope/gulp-sass/compare/v3.0.2...v3.1.0) (2022-10-07)

### Features

- improve logError ([efa2790](https://github.com/Mister-Hope/gulp-sass/commit/efa27908694df0f416845d4ab342a91a2417f33b))

## [3.0.2](https://github.com/Mister-Hope/gulp-sass/compare/v2.0.0...v3.0.2) (2022-01-07)

### Features

- add compile string api ([84a7378](https://github.com/Mister-Hope/gulp-sass/commit/84a7378632edd680837d0bc04fcadb5b127a7bdd))
- compatible with sass@v1.45 ([a00a32f](https://github.com/Mister-Hope/gulp-sass/commit/a00a32fb7a7f2c7941b7b5051b452e7ebb5c07bd))

### BREAKING CHANGES

- The legacy apis `sass` and `sassSync` are renamed to `legacyAsync` and `legacy`.
- New compile api `sass` and `sassAsync`
- Option types `LegacySassOptions` and `LegacySassAsyncOptions` for old apis, together with `SassAsyncOptions` and `SassOptions` for new apis.
- Function types `GulpSass`, `GulpSassAsync`, `LegacyGulpSass`, `LegacyGulpSassAsync` for `sass`, `sassAsync`, `legacy`, `legacyAsync`
- Requires `sass >= 1.45.0`

## [2.0.0](https://github.com/Mister-Hope/gulp-sass/compare/v1.0.0...v2.0.0) (2021-02-23)

### Features

- feat: update export function ([9df30ab](https://github.com/Mister-Hope/gulp-sass/commit/9df30ab0054f07531e8b845139c57c8c555af6e9))

### BREAKING CHANGES

- `gulpSass` -> `sassSync`
- `gulpSassAsync` -> `sass`
- new interface `SassOption`, `GulpSass`, `GulpSassSync`

## [1.0.0](https://github.com/Mister-Hope/gulp-sass/compare/7e50e7ff47dfac3ab08b61e1ea8a510a20ee29f0...v1.0.0) (2021-02-23)

### Features

- init project ([7e50e7f](https://github.com/Mister-Hope/gulp-sass/commit/7e50e7ff47dfac3ab08b61e1ea8a510a20ee29f0))
