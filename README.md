# RA2Web React

红色警戒2，一款经典的即时战略类游戏，使用React + TypeScript + Vite构建。

![image](https://github.com/user-attachments/assets/f146dc1c-ca15-456a-a8f0-4b43f2d431e8)

![image](https://github.com/user-attachments/assets/a23760df-e679-4b32-a9a2-ca51c214c420)

![image](https://github.com/user-attachments/assets/4781f451-7a51-45e2-919b-cbcb8bbd727a)

## 🎮 线上游玩

[立即开始游戏](https://game.ra2web.com) 🎮

## 🎮 项目简介

本项目是红色警戒2（red alert 2）的源代码，支持单人游戏、多人对战、地图编辑等功能，全平台通用。

## ✨ 主要特性

### 🎯 核心功能
- **多人对战** - 实时网络对战支持
- **地图系统** - 内置地图编辑器和自定义地图支持
- **MOD支持** - 支持游戏模组和自定义内容
- **回放系统** - 游戏录像回放功能

### 🎵 音频系统
- **完整音频支持** - 音效、音乐、语音全面支持
- **动态音量控制** - 分频道音量调节
- **音乐播放列表** - 支持随机播放和循环播放
- **浏览器兼容** - 自动处理浏览器音频策略

### 🎨 图形渲染
- **Three.js渲染** - 基于WebGL的高性能3D渲染
- **原版资源支持** - 完全兼容原版游戏资源格式
- **动画系统** - 单位动画、建筑动画、特效系统
- **UI系统** - 自定义JSX渲染器，完美还原原版UI

### 📁 文件系统
- **虚拟文件系统** - 支持MIX档案格式
- **本地文件访问** - File System Access API集成
- **资源管理** - 智能资源加载和缓存
- **跨平台兼容** - 支持多种浏览器和操作系统

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- 现代浏览器（支持ES2020+）

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
打开浏览器访问 `http://localhost:3000`

### 游戏资源导入

首次运行需要导入红色警戒2游戏文件：

1. 点击"导入游戏文件"按钮
2. 选择红色警戒2安装目录或游戏文件
3. 等待资源解析和导入完成
4. 开始游戏！

## 🛠 技术架构

### 前端技术栈
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 现代构建工具
- **Three.js** - 3D图形渲染
- **Web Audio API** - 音频处理

### 核心模块

#### 🎮 游戏引擎 (`src/engine/`)
- **Engine.ts** - 游戏引擎核心
- **Renderer** - 图形渲染系统
- **AudioSystem** - 音频引擎
- **VirtualFileSystem** - 虚拟文件系统

#### 🎨 用户界面 (`src/gui/`)
- **Gui.ts** - GUI系统主控制器
- **JsxRenderer** - 自定义JSX渲染器
- **Screen系统** - 屏幕管理和导航
- **Component库** - 可复用UI组件

#### 📁 数据处理 (`src/data/`)
- **文件格式解析** - SHP, VXL, MIX, INI等
- **资源管理** - 懒加载和缓存
- **数据流处理** - 二进制数据读取

#### 🌐 网络系统 (`src/network/`)
- **多人对战** - WebRTC P2P连接
- **房间管理** - 游戏房间创建和加入
- **同步机制** - 游戏状态同步

## 📖 使用指南

### 基本操作

1. **主菜单导航**
   - 快速匹配：快速找到对战
   - 自定义游戏：创建或加入房间
   - 单人游戏：离线游戏模式
   - 设置：音频、图形、键盘设置

2. **游戏内操作**
   - 鼠标左键：选择单位/建筑
   - 鼠标右键：移动/攻击命令
   - 键盘快捷键：建造、技能等

3. **音频设置**
   - 主音量：总体音量控制
   - 音乐：背景音乐音量
   - 音效：游戏音效音量
   - 语音：单位语音音量

### 高级功能

#### MOD支持
```bash
# 将MOD文件放入mods目录
/mods/your-mod-name/
  ├── rules.ini
  ├── art.ini
  └── assets/
```

#### 自定义地图
- 支持标准.map和.mpr格式
- 内置地图编辑器
- 在线地图分享

## 🔧 开发指南

### 项目结构
```
ra2web-react/
├── src/
│   ├── engine/          # 游戏引擎
│   ├── gui/             # 用户界面
│   ├── data/            # 数据处理
│   ├── network/         # 网络系统
│   ├── game/            # 游戏逻辑
│   └── util/            # 工具函数
├── public/              # 静态资源
├── extracted_modules_simple/  # 原始JS模块
└── docs/                # 文档
```

### 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 运行测试
npm run test
```

### 代码规范

- 使用TypeScript严格模式
- 遵循ESLint配置
- 使用Prettier格式化代码
- 编写单元测试

### 调试技巧

1. **开发者工具**
   - 按F12打开浏览器开发者工具
   - Console面板查看日志
   - Network面板监控资源加载

2. **调试参数**
   ```
   ?debug=true          # 启用调试模式
   ?test=glsl          # 运行GLSL测试
   ?fps=true           # 显示FPS计数器
   ```

## 🐛 故障排除

### 常见问题

#### 音频无法播放
- **原因**：浏览器自动播放策略
- **解决**：点击页面任意位置激活音频
- **状态**：系统会自动显示激活提示

#### 游戏文件导入失败
- **检查**：确保选择正确的游戏目录
- **格式**：支持原版安装目录或压缩包
- **空间**：确保浏览器存储空间充足

#### 性能问题
- **图形设置**：降低渲染质量
- **浏览器**：使用Chrome或Edge获得最佳性能
- **硬件加速**：确保浏览器启用硬件加速

#### 网络连接问题
- **防火墙**：检查防火墙设置
- **NAT**：某些网络环境可能需要端口转发
- **浏览器**：确保允许WebRTC连接

### 错误报告

如果遇到问题，请提供以下信息：
- 浏览器版本和操作系统
- 控制台错误信息
- 重现步骤
- 游戏文件版本

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 贡献领域
- 🐛 Bug修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX优化
- 🔧 性能优化
- 🌐 国际化支持

## 📄 许可证

本项目基于GNU General Public License v3.0（GPL-3.0）许可证开源。这是一个严格的Copyleft许可证，要求任何基于本项目的衍生作品也必须以相同的许可证开源。详见 [LICENSE](LICENSE) 文件。

### 许可证要求
- ✅ 可以自由使用、修改和分发
- ✅ 必须保留版权声明和许可证文本
- ⚠️ 任何衍生作品必须使用相同的GPL-3.0许可证
- ⚠️ 必须提供源代码（包括修改后的版本）
- ⚠️ 不能将GPL代码集成到专有软件中

## 🙏 致谢

- [Chronodivide](https://github.com/Chronodivide)
- Three.js社区
- React生态系统贡献者
- 所有测试用户和贡献者
- 无数热爱红警2的玩家

## 📞 联系方式

- 项目主页：[[GitHub Repository]](https://github.com/huangkaoya/redalert2)

---
