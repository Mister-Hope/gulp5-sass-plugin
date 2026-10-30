# gulp5-sass-plugin 项目审查报告

- 审查日期：2026-10-28
- 审查对象：`main` 分支 HEAD `4e70cdb`（工作区干净）
- 审查方式：源码/测试/打包/CI/文档四路并行审查 + Lead 逐条独立复现（构建产物 `dist/`、Node 24.22.1、sass 1.106.0、pnpm 12.11.2）
- 结论：`pnpm lint`、`pnpm test`（35/35）、`pnpm build`、`tsc --noEmit` 当前均通过，但存在 4 个高危缺陷（错误处理崩溃/挂起、options 被变异导致编译结果错误）与若干中低危的打包、文档、测试可信度问题。

严重度：**P1** 会导致崩溃、挂起或静默产出错误结果；**P2** 影响使用者/发布质量；**P3** 维护性与文档清理。

---

## P1 高危

### P1-1 `createError` 假定异常一定有 `span`，非 Sass 异常时 sync 抛出 TypeError、async 未处理拒绝并挂死

- 位置：[src/index.ts:37](src/index.ts#L37)（`error.span.url?.pathname`），触发点 [src/index.ts:175-193](src/index.ts#L175-L193)
- 现象（已实测，构建产物 `dist/`）：
  - sync + 非法 option：`sass({ syntax: "bogus" })` → `write threw: TypeError: Cannot read properties of undefined (reading 'url')`，无 `error` 事件。
  - async + 非法 option：`unhandledRejection: TypeError ...`，且 1.5s 后仍无 `error`/`end`（流永久挂起）。
  - 其它已验证触发路径：非法 `url`、畸形 importer、`loadPaths` 类型错误、上游插件留下损坏的 `file.sourceMap`（`applySourceMap` 抛普通 Error）、下游 `data` 监听器抛错（见 P1-2）。
- 影响：用户配置错误/上游 map 损坏时，原始可读错误被 TypeError 取代；async 下 gulp 任务永久挂起，默认 Node 则进程以 1 退出。
- 修复方案：`createError` 永不抛错；`span` 可选访问，file URL 用 `fileURLToPath` 解码；非 Sass 异常兜底为 `PluginError(PLUGIN_NAME, err)`（保留原始 message/stack）。

### P1-2 `try/catch` 与 `.then().catch()` 把 `callback()` 包了进去：错误归因错误、二次回调、async 挂起

- 位置：[src/index.ts:173-193](src/index.ts#L173-L193)
- 现象（已实测）：下游 `data` 监听器抛错时，插件把它当作 Sass 编译错误处理，位置指向伪造文件；`data` 已发出后才发 `error`，第二个文件不再处理。async 下 `.catch` 会二次调用 `callback`，配合 P1-1 变成 unhandled rejection + 挂起，真实错误丢失。
- 影响：下游插件/监听器异常被错误归因；async 下原错误丢失、任务挂死。
- 修复方案：`try` 只包裹 `compileString`；async 用双参数 `.then(onFulfilled, onRejected)`；`handleFile` 的异常单独包成 `PluginError`；调用 `callback()` 产生的异常不再走 Sass 错误路径。

### P1-3 `loadPaths` 原地变异用户 options，导致跨文件导入串味

- 位置：[src/index.ts:126](src/index.ts#L126)（浅拷贝）、[src/index.ts:159-162](src/index.ts#L159-L162)（`options.loadPaths.unshift(...)`）
- 现象（已实测）：
  - 传入 `{ loadPaths: ["/tmp/shared"] }` 编译 2 个文件后，用户数组变为 `[d2目录, d1目录, "/tmp/shared"]`（同一引用、持续增长）。
  - 跨文件污染：`b.scss` 的 `@use "vars"` 实际解析到上一个文件目录下的 `_vars.scss`（输出 red，期望 blue）。
  - `Object.freeze([...])` 作为 loadPaths → `TypeError: Cannot add property 1, object is not extensible`。
- 影响：构建结果依赖 `gulp.src` 顺序；watch 长跑内存/优先级持续污染；调用方 options 被永久修改。上游 gulp-sass 使用 `clonedeep`，属回归。
- 修复方案：新建数组 `[path.dirname(file.path), ...(pluginOptions?.loadPaths ?? [])]`；兼容字符串形式的 `loadPaths`。

### P1-4 含空格/非 ASCII（以及 Windows 盘符）路径：错误信息与 sourcemap `sources` 出现百分号编码

- 位置：[src/index.ts:37-39](src/index.ts#L37-L39)（错误路径）、[src/index.ts:75-91](src/index.ts#L75-L91)（sourcemap sources 映射）
- 现象（已实测）：`/tmp/.../my styles 目录` 下编译后 `map.sources` 为 `["tmp/.../my%20styles%20%E7%9B%AE%E5%BD%95/includes/_mix.scss"]`（应为 `includes/_mix.scss`）；错误头部显示 `.../my%20styles%20.../_bad.scss`，与 sass 自身输出的解码路径不一致。Windows 下 `/C:/...` 还会导致 `path.relative` 结果错乱（模拟验证，未实机）。
- 修复方案：统一用 `fileURLToPath(url)` 解码后再做相对化/`path.relative`；对非 file URL 兜底。

---

## P2 中危

### P2-1 Node 支持声明与实际依赖不符（并导致 CJS 在声明范围内不可用）

- 位置：[package.json:115-117](package.json#L115-L117)（`engines ">=14"`）、[tsdown.config.ts:9](tsdown.config.ts#L9)（`target: "node14"`）、[README.md:156](README.md#L156)、[.github/ISSUE_TEMPLATE/bug_report.md:20](.github/ISSUE_TEMPLATE/bug_report.md#L20)
- 证据：`sass@1.106.0` 的 engines 为 `>=20.19.0`；源码使用 `String.prototype.replaceAll`（Node 15+）；`dist/index.cjs` 依赖 ESM-only 的 `strip-ansi`，在 Node <20.19 下 `require` 抛 `ERR_REQUIRE_ESM`（已用 `--no-experimental-require-module` 实测复现）。
- 修复方案：engines 改为 `>=20.19.0`；tsdown target 改 `node20`；README/issue 模板/CI 文案统一。

### P2-2 README 所有示例使用无效选项 `outputStyle`（Dart Sass `compileString` 只认 `style`）

- 位置：[README.md:109](README.md#L109)、[README.md:118](README.md#L118)、[README.md:134](README.md#L134)、[README.md:149](README.md#L149)
- 证据（已实测）：`compileString('a{color:red}', { outputStyle: "compressed" })` 被静默忽略（输出仍展开）；`{ style: "compressed" }` 才压缩。TS 消费者传 `outputStyle` 报 `TS2353`。
- 修复方案：全部改为 `style: "compressed"`。

### P2-3 README Source Maps 示例引用未导入的 `sass.logError`（复制即报错）

- 位置：[README.md:134](README.md#L134)、[README.md:149](README.md#L149)（对应 import 只有 `sassAsync`，见 [README.md:128](README.md#L128)、[README.md:143](README.md#L143)）
- 修复方案：改为 `sassAsync.logError`。

### P2-4 公共 `.d.ts` 引用 vinyl 类型，但 `@types/vinyl` 只在 devDependencies

- 位置：[package.json:68](package.json#L68)、[src/typings.d.ts](src/typings.d.ts) 与 `dist/index.d.ts`
- 证据（已实测）：真实 consumer（`skipLibCheck:false`、有 `@types/node`、无 `@types/vinyl`）→ `TS7016: Could not find a declaration file for module 'vinyl'`；补装后通过，`skipLibCheck:true` 可掩盖。
- 修复方案：`@types/vinyl` 移入 `dependencies`。

### P2-5 发布流程没有测试/lint 门禁，也不校验 tag 与版本一致

- 位置：[.github/workflows/publish.yml:27-31](.github/workflows/publish.yml#L27-L31)
- 证据：`on: push: tags: v*` 会同时触发 Unit Test / Linter / CodeQL，但 Publish 不等待它们；`pnpm publish --no-git-checks` 前无测试步骤，也未校验 `v$npm_package_version === GITHUB_REF_NAME`。
- 修复方案：publish 前执行 `pnpm run lint:check` + `pnpm run test`；新增 tag/version 一致性校验步骤。

### P2-6 CHANGELOG 丢失已发布的 2.0.4 条目与文件表头

- 位置：[CHANGELOG.md:1](CHANGELOG.md#L1)
- 证据：npm registry 存在 2.0.4（2024-11-11 发布），git 无 `v2.0.4` tag；`git diff v2.1.0..HEAD -- CHANGELOG.md` 显示 `# Changelog` 表头与整个 `2.0.4` 小节被删除。
- 修复方案：从 `git show v2.1.0:CHANGELOG.md` 恢复表头与 2.0.4 小节。

### P2-7 README 的 `fibers` 性能章节完全过时

- 位置：[README.md:84-96](README.md#L84-L96)
- 证据：现代 Dart Sass 的 `StringOptions` 无 `fiber` 字段（传入被忽略）；`fibers` 官方声明不兼容 Node 16+，而本项目要求 ≥20.19。
- 修复方案：删除该章节，或替换为"同步/异步如何选择"的现代说明。

### P2-8 测试无法防住 P1 回归，且存在大量恒真断言

- 位置：[**tests**/sass.spec.ts:103-117](__tests__/sass.spec.ts#L103-L117)（logError mock 本身就是 error 监听器）、[**tests**/sass.spec.ts:252-283](__tests__/sass.spec.ts#L252-L283)（管道集成测试只挂 `console.error`，`expect(caller).not.toHaveBeenCalled()` 几乎恒真）、[**tests**/sass.spec.ts](__tests__/sass.spec.ts) 与 [**tests**/sassAsync.spec.ts](__tests__/sassAsync.spec.ts) 100% 复制粘贴
- 证据：34 个用例全部 `sass()` 无参调用，options 透传/loadPaths 变异零覆盖；错误路径只测了有 `span` 的 Sass 语法错误；快照逐字绑定 sass 输出（2026-10 的 sass 升级已真实导致过一次测试失败）。
- 修复方案：
  1. 抽出共享测试套件（`describe.each` / helper），sync+async 复用，async 专属用例单独写；
  2. 新增回归测试：options 透传（`style`）、用户 options 不被变异（含 frozen / 跨文件）、非法 option 与损坏 sourceMap 的错误事件（不崩溃不挂起）、下游监听器抛错、sourcemap `file`/`sourcesContent`/空格路径、`logError` 输出内容；
  3. 收紧集成测试断言（`error` → reject、断言产物内容/map/autoprefixer 前缀）；
  4. 配置 coverage thresholds。

### P2-9 测试输出目录共享且未 gitignore

- 位置：[vitest.config.ts:11](vitest.config.ts#L11)（`fileParallelism:false`）、[**tests**/sass.spec.ts:22](__tests__/sass.spec.ts#L22)、[**tests**/sassAsync.spec.ts:21](__tests__/sassAsync.spec.ts#L21)、[.gitignore](.gitignore#L1-L7)
- 现象：两套件共用 `__tests__/results`，靠关闭文件并行规避竞争；测试中断/崩溃会留下未跟踪的 `results/`。
- 修复方案：每个 suite 使用独立输出目录（或 `fs.mkdtemp`），并把结果目录加入 `.gitignore`。

---

## P3 低危（清理/加固）

| ID    | 问题                                                                                                                                                                         | 位置                                                                                                                                                                                                            | 修复方案                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| P3-1  | `sassAsync` 类型暴露 `sync?: boolean` 但实现忽略                                                                                                                             | [src/index.ts:222](src/index.ts#L222)、[src/index.ts:227-228](src/index.ts#L227-L228)                                                                                                                           | 从公开签名移除该参数                                                                    |
| P3-2  | `logError` 独立调用抛 `TypeError: this.emit is not a function`；`emit("end")` 吞错并停止后续文件；错误详情重复打印                                                           | [src/index.ts:200-205](src/index.ts#L200-L205)                                                                                                                                                                  | 类型标注 `this`、`this?.emit?.("end")` 容错、`showProperties: false`，README 注明副作用 |
| P3-3  | `SassError` 类型承诺 `span`/`file`，运行时不存在（PluginError 不拷贝原型 getter，`file` 从未赋值）                                                                           | [src/index.ts:16-21](src/index.ts#L16-L21)、[src/index.ts:36-48](src/index.ts#L36-L48)                                                                                                                          | 在 createError 中显式挂载 `span`/`file`，使类型与运行时一致                             |
| P3-4  | sourcemap 死逻辑/未用字段/强制覆盖：`sassMap.file ??=` 随后被覆盖、`sourcesContent` 从未读、`sourceMapIncludeSources` 强制 true、typings 注释块残留                          | [src/index.ts:72](src/index.ts#L72)、[src/index.ts:97](src/index.ts#L97)、[src/index.ts:23-27](src/index.ts#L23-L27)、[src/index.ts:168](src/index.ts#L168)、[src/typings.d.ts:19-27](src/typings.d.ts#L19-L27) | 删死代码；回填上游 `sourcesContent`；尊重用户设置；清理注释块                           |
| P3-5  | 依赖卫生：`source-map-js` 仅类型使用应在 devDeps；`picocolors` 重复；`@rollup/plugin-node-resolve` 未使用；`commitlint` 配置无依赖支撑；`repository.url` 使用已停用 `git://` | [package.json:21](package.json#L21)、[L51](package.json#L51)、[L55](package.json#L55)、[L63](package.json#L63)、[L68](package.json#L68)、[L83](package.json#L83)、[L98-L102](package.json#L98-L102)             | 按项调整/删除                                                                           |
| P3-6  | Renovate 第一条规则只有 match 没有 action（空规则）                                                                                                                          | [.github/renovate.json:8-11](.github/renovate.json#L8-L11)                                                                                                                                                      | 补 `"automerge": false`（或删除）                                                       |
| P3-7  | `prepublish` 在 `pnpm publish` 时会重复 clean+build                                                                                                                          | [package.json:47](package.json#L47)                                                                                                                                                                             | 改为 `prepublishOnly`                                                                   |
| P3-8  | README 类型名写错、gulp-sass 论断失真、"100% coverage" 无门禁、Node 支持说法矛盾                                                                                             | [README.md:18-20](README.md#L18-L20)、[README.md:35](README.md#L35)、[README.md:102](README.md#L102)、[README.md:156](README.md#L156)                                                                           | 更新文案，coverage 与 thresholds 一起修                                                 |
| P3-9  | codecov 覆盖率上传未显式指定文件（未验证是否自动发现）                                                                                                                       | [.github/workflows/unit-test.yml:50-54](.github/workflows/unit-test.yml#L50-L54)                                                                                                                                | 显式 `files: ./coverage/cobertura-coverage.xml`                                         |
| P3-10 | `isBuffer()` 无 else 分支，传入非 Vinyl 鸭子对象会静默丢文件、不回调（流挂起）                                                                                               | [src/index.ts:140](src/index.ts#L140)                                                                                                                                                                           | 补 fallback `PluginError` 并加测试                                                      |
| P3-11 | Windows 专用路径分支无测试/CI 覆盖                                                                                                                                           | [src/index.ts:77-91](src/index.ts#L77-L91)、[.github/workflows/unit-test.yml:14](.github/workflows/unit-test.yml#L14)                                                                                           | P1-4 的 `fileURLToPath` 已改善解码；后续可加 windows runner（本轮不强制）               |

---

## 已核实“不是问题”（避免误伤）

- 构建产物完整：`dist/index.js` + `index.cjs` + `index.d.ts` + `index.d.cts` + sourcemap；ESM/CJS 消费者在 TS `nodenext` 下类型解析均通过（无需 `exports.types` 条件）。
- `pnpm ci` 命令真实存在，lockfile 与 `package.json` 同步（frozen 校验通过）。
- `pnpm/setup@v3` 的 `runtime`、`codecov-action@v7` 的 `use_oidc/report_type/files` 参数均有效；发布使用 npm trusted publishing，`id-token: write` 足够，无需 `NODE_AUTH_TOKEN`/`--provenance`。
- `TEST_REPORT` 表达式、junit 输出路径与 vitest 配置匹配；`BUNDLE_ANALYSIS` 构建可正常执行。
- partial `_` 跳过、空文件、`isNull`/`isStream`、`.sass` 语法判定与上游 gulp-sass 行为一致（partial 跳过建议补文档）。
- 正常 Sass 异常的定位/格式化（无空格路径）正确；快照已随 sass 1.106 的颜色序列化变化更新。
- 旧仓库名 `Mister-Hope/gulp-sass` 的链接经 GitHub 301 重定向到本仓库，不算坏链。
- `minimumReleaseAge` 默认 1 天、`devEngines` 与 `engines` 语义不同、`.ncurc.cjs` 有效、commit-msg hook 规则正确、CI push 无分支过滤是有意为之、`dist/index.d.ts` 引用 `.d.ts.map` 属 tsdown 已知 bug。

---

## 修复进度

| ID    | 问题                         | 状态     | 备注                                                                            |
| ----- | ---------------------------- | -------- | ------------------------------------------------------------------------------- |
| P1-1  | createError 非 Sass 异常崩溃 | 已修复   | createError 永不抛错；span 可选 + fileURLToPath；非 Sass 异常兜底为 PluginError |
| P1-2  | callback 被包进 try/catch    | 已修复   | try 只包编译调用；async 用双参数 then；下游抛错 destroy 结束流                  |
| P1-3  | loadPaths 变异               | 已修复   | 每次编译新建 loadPaths 数组并兼容字符串；跨文件串味回归测试由 test-fixer 补     |
| P1-4  | 路径百分号编码               | 已修复   | fileURLToPath 解码错误路径与 sourcemap sources；空格/中文路径实测通过           |
| P2-1  | Node 支持声明                | 已修复   | engines >=20.19.0、tsdown target node20、README/issue 模板同步                  |
| P2-2  | README outputStyle           | 已修复   | 4 处改为 `style: "compressed"`                                                  |
| P2-3  | README sass.logError         | 已修复   | Source Maps 示例改为 `sassAsync.logError`                                       |
| P2-4  | @types/vinyl                 | 已修复   | 移至 dependencies                                                               |
| P2-5  | 发布门禁                     | 已修复   | publish 前 lint:check + test，新增 tag↔version 校验                             |
| P2-6  | CHANGELOG 2.0.4              | 已修复   | 恢复 `# Changelog` 表头与 2.0.4 小节                                            |
| P2-7  | README fibers                | 已修复   | fibers 章节替换为 Sync or async 现代说明                                        |
| P2-8  | 测试可信度/覆盖              | 进行中   | test-fixer：共享 suite + 回归测试 + coverage thresholds                         |
| P2-9  | results 目录                 | 进行中   | test-fixer 改为 tmpdir；.gitignore 已加 `__tests__/results/`                    |
| P3-1  | sassAsync sync 参数          | 已修复   | 从公开签名移除                                                                  |
| P3-2  | logError                     | 已修复   | this 可选/独立调用不抛、showProperties:false                                    |
| P3-3  | SassError 运行时形状         | 已修复   | PluginError 显式挂载 span/file                                                  |
| P3-4  | sourcemap 死代码/字段        | 已修复   | 删死赋值、回填 sourcesContent、尊重 sourceMapIncludeSources、清理 typings       |
| P3-5  | 依赖卫生                     | 已修复   | source-map-js→devDeps、picocolors 去重、删未用依赖与死配置、git+https           |
| P3-6  | Renovate 空规则              | 已修复   | @types/node patch 规则补 automerge:false                                        |
| P3-7  | prepublish                   | 已修复   | 改 prepublishOnly（publish.yml 仍显式 build，存在一次重复构建，可接受）         |
| P3-8  | README 文案                  | 已修复   | 类型名、gulp-sass 论断、Node 支持、partial 跳过说明                             |
| P3-9  | codecov files                | 已修复   | coverage 上传显式指定 cobertura 文件                                            |
| P3-10 | isBuffer fallback            | 已修复   | 非 Buffer 输入返回 PluginError                                                  |
| P3-11 | Windows 测试覆盖             | 部分处理 | fileURLToPath 已覆盖解码；windows runner 未加（本轮不强制）                     |

## 修复验证记录（Lead）

- 源码定向验证：`oxfmt` + `oxlint`（0 warnings）+ `tsc --noEmit` 通过；`tsdown` 构建通过。
- 行为探针（构建产物 `dist/`）：
  - 非法 option：sync/async 均 emit PluginError（message 含 `Unknown syntax`），无 TypeError、async 不挂起。
  - 用户 `loadPaths` 编译后保持 `["/custom/path"]` 不变；`Object.freeze(loadPaths)` 正常工作；跨文件 `@use "vars"` 解析到 shared（blue），不再串味。
  - 含空格/中文目录：`sourceMap.sources = ["app.scss", "includes/_mix.scss"]`，错误 `relativePath` 保留真实空格路径。
  - `sass.logError(err)` 独立调用不抛；非 Buffer 鸭子对象收到 `Only Buffer files are supported`。
  - 下游 `data` 监听器抛错：sync 抛原始 `consumer boom`；async 触发 `error` 事件并 destroy 结束，无挂起/unhandled rejection。
  - 错误事件对象包含 `span` 与 `file`。
- 依赖收口：`pnpm install` 成功（全局 store `~/Library/pnpm/store/v11`，`node_modules` 712K，无 `.pnpm-store`），lockfile 已与 package.json 同步。
- 待 test-fixer 完成后执行全量验收（`pnpm lint`、`pnpm test`、`pnpm build`、frozen lockfile 校验）。

---

## 最终验收（Lead，2026-10-29）

全部通过：

| 检查                                             | 结果                                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`（oxlint --fix + oxfmt）              | 0 warnings / 0 errors，且不产生额外文件变更                                                                                      |
| `pnpm test`（vitest --coverage）                 | 3 files / **77 tests 全绿**；`src/index.ts` 覆盖率 **Stmts 100% / Branch 100% / Funcs 100% / Lines 100%**（thresholds 已强制）   |
| `pnpm build`（tsdown）                           | 成功，ESM + CJS + `.d.ts`/`.d.cts` + sourcemap 正常产出                                                                          |
| `tsc --noEmit`                                   | 通过                                                                                                                             |
| `pnpm install --frozen-lockfile --lockfile-only` | 通过（lockfile 与 package.json 同步，CI `pnpm ci` 不会失败）                                                                     |
| 快照                                             | `git diff __tests__/__snapshots__` 为空（describe 名与快照 key 未变）                                                            |
| 全局 store 自检                                  | `pnpm store path` = `~/Library/pnpm/store/v11`；`node_modules` 712K；无 `.pnpm-store`；lockfile 通过 pnpm 12 supply-chain policy |

改动统计：16 个已跟踪文件修改（+556/−812），新增 `REVIEW.md`、`__tests__/__fixtures__/suite.ts` 与 `suite/` 下 11 个模块。未提交（等待 review 后由用户决定 commit）。

### 遗留说明

- P3-11 Windows runner 未添加（`fileURLToPath` 已使解码逻辑跨平台正确，但未在 Windows CI 实测）。
- P3-7 改为 `prepublishOnly` 后，publish workflow 仍有显式 `Build project` 步骤，`pnpm publish` 时会再 clean+build 一次（冗余但无害；如需可删除 workflow 里的显式 build，因为 `prepublishOnly` 已负责构建）。
- `fileParallelism: false` 保留（新一代测试已用独立 tmpdir，保留仅为稳妥）。
- 发布鉴权（npm trusted publishing）、codecov 上传、`pnpm ci` 等 CI 行为无法在本地完全端到端验证，但参数与实际产物路径已交叉核对。

---

## 第二轮追加修复（2026-10-30）

本轮期间仓库出现了新的提交，先记录现状：

- `b7f4b3c feat: improve test coverage`：用户已提交第一轮全部修复。
- `0d1e645 build: bump deps`：用户完成依赖升级（sass 1.107、oxlint 1.90、oxfmt 0.75、tsdown 0.23.3、pnpm 12.15 等）与 CI 现代化（`pnpm/setup@v3` + `require-lockfile: true` 自动安装、Node 版本矩阵改为 `^22.23.4 / ^24.22.1 / ^26.13.0`、`TEST_REPORT` 条件同步），其中也包含了 `test`/`test:watch` 脚本改动。

### 本轮追加修复

| 项          | 修复内容                                                                                                                                                                               | 验证                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 冗余构建    | [publish.yml](.github/workflows/publish.yml) 删除显式 `Build project` 步骤：`pnpm publish --dry-run` 实测会依次执行 `prepublishOnly`（clean+build）→ `prepare`，构建由发布生命周期保证 | dry-run 输出 `prepublishOnly$ pnpm run clean && pnpm run build`            |
| 测试并行    | [vitest.config.ts](vitest.config.ts) 移除 `fileParallelism: false`，测试文件改为并行执行（各 suite 已使用独立 `mkdtemp` 目录）                                                         | 连续 3 次 `pnpm test` 均 77/77 通过，覆盖率四项 100%                       |
| CI 报告模式 | 验证 `TEST_REPORT=true pnpm test`：junit + cobertura 产物路径与 workflow/`codecov-action` 参数一致                                                                                     | `coverage/test-report.junit.xml`、`coverage/cobertura-coverage.xml` 均生成 |
| 文档补充    | [README.md](README.md) Error logging 段补充 `logError` 作为 error 监听器会结束当前流的副作用                                                                                           | 文案检查                                                                   |
| 忽略清理    | [.gitignore](.gitignore) 删除测试已不再产生的 `__tests__/results/`                                                                                                                     | 测试运行后无该目录                                                         |
| CI 改动复核 | 确认 `pnpm/setup@v3` 的 `require-lockfile` 是真实输入、默认自动执行安装；Node range 矩阵与 `TEST_REPORT` 条件均有效；7 个 workflow YAML 全部 `yaml valid`                              | 官方 action.yml/README + `yaml valid`                                      |

### 第二轮验收（全绿）

| 检查                                             | 结果                                   |
| ------------------------------------------------ | -------------------------------------- |
| `pnpm lint` / `pnpm lint:check`                  | 0 warnings / 0 errors                  |
| `pnpm test`                                      | 77/77，覆盖率 100% × 4（并行执行稳定） |
| `TEST_REPORT=true pnpm test`                     | 通过，cobertura + junit 产物路径正确   |
| `pnpm build`                                     | 通过（tsdown 0.23.3）                  |
| `tsc --noEmit`                                   | 通过                                   |
| `pnpm install --frozen-lockfile --lockfile-only` | 通过（新依赖锁文件一致）               |
| `pnpm publish --dry-run`                         | 通过（发布生命周期会自行构建）         |

### 仍遗留

- P3-11 Windows runner 未添加（本地无法验证 Windows 行为，避免引入会失败的 CI job）。
- `@types/node` 仍为 22.x，而 CI 主运行环境为 Node 26（类型滞后，交由 Renovate 跟进）。
