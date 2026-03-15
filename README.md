# RA2WEB React

免责声明：这是基于《时空分裂（chronodivide）》中文版RA2WEB www.ra2web.com 的分析而开发，并意图基于最新的react和three版本进行重构。

但项目所有权利（包括收益权）归《时空分裂（chronodivide）》/RA2WEB负责人所有。未经《时空分裂（chronodivide）》的所有者/RA2WEB负责人许可，严禁用于任何商业行为。

需要注意的是，《时空分裂（chronodivide）》的所有者从未以任何方式开源游戏客户端代码（即便存在诸如mod-sdk之类的周边开源内容）。本项目运行产生的BUG、功能不完善，不能等同视为对《时空分裂（chronodivide）》的名誉贬损。任何基于本项目开展商业行为，包括但不限于植入广告、开发“弹幕红警”收受礼物获利、直接封装收费、以“作者”身份骗取赞助和充电收益等，均视为对《时空分裂（chronodivide）》原作者Alexandru Ciucă和RA2WEB的侵权。

Disclaimer

This project is developed based on the analysis of the Chinese version of Chronodivide — RA2WEB (www.ra2web.com), and is intended to be refactored using the latest versions of React and Three.js. All rights to this project, including profit rights, belong to the owner of Chronodivide. Without permission from the owner of Chronodivide, any commercial use of this project is strictly prohibited.

It should be noted that the owner of Chronodivide has never open-sourced the game client code in any form, even though some peripheral open‑source content such as a mod‑SDK exists. Bugs, incomplete functions or other issues arising from the operation of this project shall not be regarded as damage to the reputation of Chronodivide. Any commercial activities conducted based on this project, including but not limited to placing advertisements, developing a “bullet-screen Red Alert” mode to profit from gifts, directly packaging and selling the project, or fraudulently obtaining sponsorship and donation revenue by claiming to be the “author”, shall be deemed as infringement upon the original author of Chronodivide, Alexandru Ciucă, and RA2WEB.

红色警戒2网页版，一款经典的即时战略类游戏的完整TypeScript重构版本，使用React + TypeScript + Vite + Three.js构建。

![image](https://github.com/user-attachments/assets/f146dc1c-ca15-456a-a8f0-4b43f2d431e8)

![image](https://github.com/user-attachments/assets/a23760df-e679-4b32-a9a2-ca51c214c420)

![image](https://github.com/user-attachments/assets/4781f451-7a51-45e2-919b-cbcb8bbd727a)

## 🎮 项目简介

本项目是红色警戒2（Red Alert 2）的完整TypeScript重构版本，基于原版游戏逻辑进行现代化改造。目前处于开发阶段，正在逐步实现完整的游戏功能。

**注意：这是一个开发中的项目，并非完整可玩的游戏版本。**

## ✨ 主要特性

### 🎯 开发进度
- **游戏引擎** - ✅ 基础引擎架构完成
- **数据解析** - ✅ 支持原版文件格式（MIX、SHP、VXL、INI等）
- **图形渲染** - ✅ Three.js渲染系统
- **音频系统** - ✅ 完整音频引擎
- **用户界面** - 🚧 自定义JSX渲染器开发中
- **游戏逻辑** - 🚧 核心游戏机制实现中
- **网络对战** - 📋 计划中（基础框架已搭建）

### 🎵 音频系统
- **多格式支持** - WAV、MP3音频文件解析
- **Web Audio API** - 现代浏览器音频处理
- **音频混合器** - 支持多通道音量控制
- **AudioBag支持** - 原版音频包格式兼容
- **浏览器策略** - 自动处理音频播放限制

### 🎨 图形渲染
- **Three.js引擎** - 基于WebGL的现代3D渲染
- **原版资源** - SHP、VXL、TMP、PCX格式完整支持
- **等距视角** - 忠实还原原版等距投影
- **Sprite批处理** - 优化的2D精灵渲染
- **着色器系统** - 可扩展的GLSL着色器支持
- **React集成** - 自定义JSX渲染器用于UI

### 📁 文件系统
- **虚拟文件系统** - 完整的VFS抽象层
- **MIX档案支持** - 原版MIX文件格式解析
- **文件系统API** - 现代浏览器本地文件访问
- **懒加载** - 按需资源加载和缓存
- **7z解压** - 支持压缩包资源导入
- **跨平台** - 支持所有现代浏览器

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- 现代浏览器（支持ES2020+、WebGL 2.0、Web Audio API）
- 支持File System Access API的浏览器（推荐Chrome/Edge）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd ra2web-react
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
打开浏览器访问 `http://127.0.0.1:4000`

**调试模式：**
- `http://127.0.0.1:4000?test=glsl` - GLSL着色器测试
- `http://127.0.0.1:4000?debug=true` - 启用调试模式

### 开发测试

项目包含多个测试工具用于验证各个模块：

1. **文件格式测试** - 验证MIX、SHP、VXL等文件解析
2. **渲染测试** - 测试图形渲染和着色器
3. **音频测试** - 验证音频系统功能
4. **数据结构测试** - 验证游戏数据解析

**注意：** 完整游戏功能仍在开发中。

## 🛠 技术架构

### 技术栈
- **React 18** - 用户界面框架
- **TypeScript 5.3+** - 严格类型检查
- **Vite** - 现代构建工具和开发服务器
- **Three.js 0.177** - WebGL 3D渲染引擎
- **Web Audio API** - 现代音频处理
- **File System Access API** - 本地文件访问
- **WebWorkers** - 后台数据处理
- **7z-wasm** - 压缩文件解析

### 核心模块

#### 🎮 游戏引擎 (`src/engine/`)
- **Engine.ts** - 游戏引擎核心和资源管理
- **gfx/** - WebGL渲染系统和着色器
- **sound/** - 音频系统（AudioSystem、Mixer、Music等）
- **renderable/** - 可渲染对象系统（100+个渲染组件）
- **gameRes/** - 游戏资源配置和加载
- **animation/** - 动画系统

#### 🎨 用户界面 (`src/gui/`)
- **Gui.ts** - GUI系统主控制器
- **jsx/** - 自定义JSX渲染器实现
- **screen/** - 屏幕管理系统（190+个屏幕文件）
- **component/** - React UI组件库（30个组件）
- **HtmlReactElement** - HTML与React桥接
- **Viewport.ts** - 视口管理

#### 📁 数据处理 (`src/data/`)
- **文件格式** - MixFile、ShpFile、VxlFile、TmpFile、PcxFile等
- **编码解析** - Blowfish、Format80、Format5、MiniLzo等
- **地图数据** - 完整的地图文件解析和对象系统
- **虚拟文件系统** - VFS抽象层（10个VFS组件）
- **数据流** - 二进制数据读取和CRC32校验
- **配置文件** - INI文件解析器

#### 🌐 网络系统 (`src/network/`)
- **WolConnection** - 基础网络连接框架
- **IRC连接** - 聊天系统支持
- **天梯系统** - 排行榜和玩家档案
- **HTTP请求** - RESTful API客户端
- **回放系统** - 游戏录像数据结构

**注意：** 网络对战功能仍在开发中

## 🛠 开发指南

### 项目当前状态

1. **已完成模块**
   - 数据文件解析（MIX、SHP、VXL等）
   - 图形渲染引擎
   - 音频系统
   - 基础游戏引擎
   - UI框架

2. **开发中模块**
   - 游戏逻辑系统（Game.ts包含1100+行代码）
   - 用户界面屏幕
   - 网络系统

3. **测试工具**
   - 各种Tester类用于验证功能
   - GLSL着色器测试
   - 文件格式解析测试

### 核心系统架构

#### 游戏对象系统
- **GameObject基类** - 所有游戏对象的基础
- **Trait系统** - 模块化行为组件（30+个trait）
- **事件系统** - 游戏事件总线（68个事件类型）
- **AI系统** - 人工智能和机器人

#### 地图系统
- **MapFile** - 地图文件解析
- **Theater** - 地形主题系统
- **触发器** - 90+个触发器类型
- **叠加层** - 矿物、道路等地形叠加

### 详细项目结构
```
ra2web-react/
├── src/
│   ├── engine/          # 游戏引擎 (200+ 文件)
│   │   ├── gfx/         # WebGL渲染系统 (34 文件)
│   │   ├── renderable/  # 可渲染对象 (100 文件)
│   │   ├── sound/       # 音频系统 (15 文件)
│   │   └── gameRes/     # 资源管理 (16 文件)
│   ├── gui/             # 用户界面 (250+ 文件)
│   │   ├── screen/      # 屏幕管理 (190 文件)
│   │   ├── component/   # React组件 (30 文件)
│   │   └── jsx/         # JSX渲染器 (4 文件)
│   ├── data/            # 数据处理 (80+ 文件)
│   │   ├── vfs/         # 虚拟文件系统 (10 文件)
│   │   ├── encoding/    # 编码解析 (6 文件)
│   │   └── map/         # 地图数据 (14 文件)
│   ├── game/            # 游戏逻辑 (500+ 文件)
│   │   ├── gameobject/  # 游戏对象 (166 文件)
│   │   ├── event/       # 事件系统 (68 文件)
│   │   ├── trigger/     # 触发器 (90 文件)
│   │   └── trait/       # 特性系统 (30 文件)
│   ├── network/         # 网络系统 (基础框架)
│   ├── util/            # 工具函数 (30+ 文件)
│   └── tools/           # 开发测试工具 (10 文件)
└── public/              # 静态资源和库文件
```

### 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 开发规范

- **TypeScript严格模式** - 启用所有类型检查
- **模块化设计** - 清晰的模块边界和依赖关系
- **事件驱动** - 使用EventDispatcher进行组件通信
- **资源懒加载** - LazyResourceCollection按需加载
- **错误处理** - 完整的错误处理和日志系统

### 调试技巧

1. **开发者工具**
   - 按F12打开浏览器开发者工具
   - Console面板查看日志
   - Network面板监控资源加载

2. **调试参数**
   ```
   ?debug=true          # 启用调试模式
   ?test=glsl          # 运行GLSL着色器测试
   ```

3. **测试工具类**
   - `AircraftTester` - 飞行器测试
   - `BuildingTester` - 建筑测试
   - `VehicleTester` - 载具测试
   - `SoundTester` - 音频测试
   - `ShpTester` - SHP文件测试

## 🐛 故障排除

### 开发问题

#### TypeScript编译错误
- **检查类型定义** - 确保所有接口正确实现
- **导入路径** - 使用相对路径导入模块
- **严格模式** - 处理null/undefined检查

#### 渲染问题
- **WebGL支持** - 确保浏览器支持WebGL 2.0
- **着色器编译** - 使用`?test=glsl`测试着色器
- **Three.js版本** - 当前使用0.177版本

#### 文件系统访问
- **CORS策略** - 开发服务器已配置跨域头
- **文件API** - 需要支持File System Access API的浏览器
- **权限** - 用户需要授权文件访问

#### 音频系统
- **Web Audio API** - 确保浏览器支持
- **用户交互** - 音频播放需要用户手势激活
- **格式支持** - WAV和MP3文件解析

### 贡献开发

项目正在积极开发中，欢迎贡献：
- **功能实现** - 实现游戏逻辑和UI
- **测试编写** - 为各个模块编写测试
- **性能优化** - 优化渲染和数据处理
- **文档编写** - 改进代码文档和注释

## 🤝 贡献指南

### 开发流程

1. **Fork项目** - 创建你的项目副本
2. **创建分支** - `git checkout -b feature/module-name`
3. **迁移模块** - 将JavaScript模块转换为TypeScript
4. **添加类型** - 为所有函数和类添加类型注解
5. **测试功能** - 使用相应的Tester类验证功能
6. **提交代码** - 提供清晰的提交信息
7. **创建PR** - 详细描述更改内容

### 迁移优先级
- 🔥 **核心游戏逻辑** - Game.ts相关功能
- 🎨 **UI屏幕** - 完善用户界面
- 🌐 **网络系统** - 实现多人对战
- 🎮 **游戏对象** - 单位、建筑、武器系统
- 🗺️ **地图编辑器** - 地图创建和编辑功能

## 📄 许可证

本项目基于GNU General Public License v3.0（GPL-3.0）许可证开源。详见 [LICENSE](LICENSE) 文件。

### 重要说明
- ✅ 可以自由使用、修改和分发
- ✅ 必须保留版权声明和许可证文本
- ⚠️ 任何衍生作品必须使用相同的GPL-3.0许可证
- ⚠️ 必须提供源代码（包括修改后的版本）
- ⚠️ 不能将GPL代码集成到专有软件中

**注意：** 本项目仅用于学习和研究目的。红色警戒2是EA公司的知识产权，请确保拥有合法的游戏副本。

## 🙏 致谢

- **原始项目** - 基于现有的RA2Web实现
- **Three.js社区** - 提供强大的WebGL渲染引擎
- **React团队** - 现代用户界面框架
- **TypeScript团队** - 类型安全的JavaScript超集
- **开源社区** - 各种依赖库的维护者
- **红警2玩家社区** - 持续的热情和支持
- **EA Games** - 原版红色警戒2游戏

## 📞 项目信息

- **开发状态**: 🚧 积极开发中
- **版本**: 0.0.0 (开发版)
- **技术栈**: React 18 + TypeScript 5.3 + Three.js 0.177 + Vite
- **目标**: 完整的红色警戒2网页版实现

---

**免责声明**: 本项目仅供学习研究使用，不用于商业目的。红色警戒2及相关商标归EA公司所有。

---
