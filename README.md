# Antigravity 远控 (Android App)

专为手机远程控制电脑端 Antigravity 打造的轻量级 Android 应用：保存多台电脑的远控链接，打开 App 自动访问，并在不同电脑间一键秒切。

## 核心功能

- **多电脑链接管理**：保存多台电脑的 Antigravity 远控链接，支持自定义名称、颜色标签、备注与一键从剪贴板导入。
- **打开即自动访问**：启动 App 自动打开默认或上次使用的电脑远控界面。
- **一键切换远控电脑**：
  - 顶部栏左右箭头可快速切到上一台/下一台电脑。
  - 点击顶部设备名打开切换面板，点击任意电脑立即切换。
  - 支持**切换时保持后台连接**（最多保留 4 个活跃会话），切回已打开的电脑无需重新加载。
- **全屏沉浸模式**：点击顶部栏右上角「展开」按钮可收起顶栏，仅保留右上角半透明悬浮胶囊，避免遮挡操作区。

## 手机上如何使用

### 方式一：Expo Go 扫码立即体验（最快）

1. 在安卓手机上安装 **Expo Go** App。
2. 确保手机与电脑处于同一局域网，在项目目录运行：
   ```bash
   cd antigravity-remote-app
   npm start
   ```
3. 使用手机 **Expo Go** 扫描终端中的二维码即可直接运行。

### 方式二：云端打包独立 `.apk` 安装包（无需本地 Android Studio / Java）

项目已配置好 `eas.json`（`buildType: "apk"`）：

```bash
cd antigravity-remote-app
npx eas-cli login
npx eas-cli build -p android --profile preview
```

构建完成后会生成一个 `.apk` 下载链接，下载到安卓手机直接安装即可使用。
