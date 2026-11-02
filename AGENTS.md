# 项目定位

- 本仓库是 Aurai 内「随机菜单」小程序的 React 源码，主要运行目标是 Aurai HTML 宿主。本地浏览器用于开发预览。
- 宿主仓库默认位于 `../aurai-flutter`；独立 Flutter 版本 `../random-menu-flutter` 仅作为功能迁移和素材参考，不参与本项目构建，也不会自动共享数据。
- 项目关系、打包步骤及运行时联动见 [README.md](README.md)。修改桥接或交付方式时同步维护相关说明。

# 构建与宿主资源

- 使用单文件构建，保持 `dist/index.html` 内联 JS、CSS 和所需静态资源；保留 hash 路由，不能要求宿主提供 Web 服务器路由或 Vite 开发服务。
- `npm run build` 只构建当前项目。`npm run bundle:aurai` 会构建并将 HTML、图标和目录项写入 Aurai 仓库，涉及另一仓库的文件修改；需要按当前任务授权范围执行。
- 小程序标识保持 `builtin.random-menu`，页面为 `assets/miniapps/random-menu.html`，图标为 `assets/miniapps/icons/random-menu.png`。通过 `scripts/sync-to-aurai.mjs` 同步，版本由 HTML 的 SHA-256 生成，保留 `catalog.json` 中其他条目。
- 不直接编辑构建产物实现功能，也不把同步资源、安装宿主和发布小程序库视为同一操作。

# Aurai 桥接与数据

- 以当前 Aurai 宿主实现为准：`lib/src/html_games/html_game_lifecycle.dart` 定义桥接入口，`lib/src/html_games/html_ai_script.dart` 定义 AI 桥接，`lib/src/agent/html_app_data_tool.dart` 提供接口说明。扩展宿主调用前先核对这些文件，不能假设浏览器 API 等同于宿主能力。
- 业务数据经 `src/data/menu.ts` 统一使用 `AuraiHTML.readData/writeData` 读写 `random_menu.json`，写入必须携带读取到的 revision。冲突时重新读取并协调，保留尚未保存的输入，不能盲目覆盖。
- 仅在没有宿主桥接的独立浏览器环境使用 localStorage；宿主读写出错不得静默切换存储、清空数据或用演示数据替代。
- `aurai:messageupdate` 用于重新读取并展示共享数据，不能因此自动发起 AI 请求、回调或重复写入。
- 后续接入 AI 时使用 `AuraiHTML.ai.getStatus/complete` 和宿主模型配置，不在页面中存放密钥或另建默认模型通道。生成结果需要验证并明确保存；失败通过 toast 提示，不自动换模型或重发。
- 若接入内联预览与全屏双实例，遵守 `AuraiHTML.presentation.interactive` 和 `aurai:presentationchange`：只读预览继续显示数据更新，但不能写数据、提交事件或启动自动任务。
- 应用标识、内部数据路径、revision 等仅用于实现，不展示给用户，也不要求用户手填。

# 验证与协作

- 页面改动检查手机尺寸、底栏遮挡、滚动和受影响的操作；宿主能力改动还需在 Aurai 中验证。构建成功、本地浏览器正常、资源同步成功和真机验证通过要分别报告。
- 如需启动验证服务，使用新的空闲端口，不占用或重启其他开发任务的服务。
- 可能有其他 AI 同时修改本仓库和宿主仓库，保留其他任务的改动；无明确要求时不顺手修复与本次任务无关的问题。
- 未经明确要求，不新增或修改测试代码；确需回归测试，先说明真实风险并征得同意。
