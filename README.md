<p align="center">
  <img src="public/favicon.svg" width="80" alt="logo" />
</p>

<h1 align="center">拼豆图谱生成器</h1>
<p align="center">Perler Bead Pattern Studio</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" />
  <img src="https://img.shields.io/badge/anime.js-4.4.1-FF6B6B" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

将任意图片一键转换为拼豆像素图谱。CIELAB 色彩空间精准匹配 6 大品牌 645 种拼豆颜色，导出带色号和统计的高分辨率图纸。

## 特性

- **🖼️ 智能转换** — 上传任意图片，自动像素化并匹配最接近的拼豆颜色
- **🎨 多品牌调色板** — 支持 MARD (291色)、Perler (94色)、Artkal (159色)、Hama (53色)、Nabbi (30色)、Ikea (18色)
- **🔬 CIELAB 算法** — 感知均匀色彩空间匹配，远比 RGB 精准，按宽度自动限色
- **✏️ 图谱编辑** — 画笔、橡皮擦、吸色器，支持撤销/重做 (50步)、镜像翻转
- **📐 灵活参数** — 宽度 10–200 颗、网格大小 5mm/2.6mm、珠子样式 (方圆中空)
- **📤 多格式导出** — PNG 高清图纸 (每珠印色号) / PDF / SVG / CSV 采购清单 / JSON 数据
- **🎬 流畅动画** — anime.js 驱动的弹窗、面板折叠/展开、入场动画
- **🖥️ 纯前端** — 无需后端，所有处理在浏览器完成

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev        # → http://localhost:5173

# 生产构建
npm run build      # → dist/
```

> **系统要求**：Node.js ≥ 18，现代浏览器（Chrome / Firefox / Edge）

## 使用指南

| 步骤 | 操作 |
|------|------|
| ① 上传 | 点击页面中央"上传图片"或右侧面板中的上传按钮，选择 JPG/PNG/WebP |
| ② 裁剪 | 拖拽选框确认处理区域，支持全图/原图/取消 |
| ③ 调整 | 裁剪后自动展开设置面板，调节宽度、品牌、网格大小、珠子样式等 |
| ④ 编辑 | 点击右侧"工具"图标展开编辑栏：画笔涂抹、橡皮擦、吸色器取色 |
| ⑤ 导出 | 在设置面板中导出 PNG/PDF/SVG/CSV/JSON |

**快捷操作**：`B` 画笔 / `E` 橡皮擦 / `I` 吸色器 / `Ctrl+Z` 撤销 / `Ctrl+Shift+Z` 重做

## 导出格式

| 格式 | 说明 |
|------|------|
| **PNG** | 40px 高清格子 + 每珠色号 + 10格红色分隔线 + 右侧统计面板 |
| **PDF** | A4 尺寸，图纸页 + 颜色统计清单 |
| **SVG** | 矢量格式，10px 格子，可无限缩放 |
| **CSV** | 颜色采购清单（编号、名称、Hex、数量、占比） |
| **JSON** | 完整数据（元数据、颜色坐标清单、矩阵） |

## 颜色匹配原理

```
上传图片 → Canvas 缩放 → 逐像素 RGB → Linear RGB → XYZ → CIELAB
                                                              ↓
                                                    LAB 欧氏距离最近邻
                                                              ↓
                                                    匹配品牌调色板颜色
```

sRGB 到 CIELAB 的完整色彩空间转换管线，确保护士蓝不会被匹配成紫色、粉红不会被匹配成橘色。

## 品牌颜色库

| 品牌 | 颜色数 | 采样策略 |
|------|--------|----------|
| MARD | 291 | 72/96/120/144/168/291 均匀采样，保证色域覆盖 |
| Perler | 94 | 全量 |
| Artkal | 159 | 全量 |
| Hama | 53 | 全量 |
| Nabbi | 30 | 全量 |
| Ikea-Pyssla | 18 | 全量 |
| **合计** | **645** | |

限色公式：`maxColors = Math.max(24, Math.round(gridWidth × 2.5))`

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | TailwindCSS 3 |
| 图形 | Canvas 2D API + OffscreenCanvas + ResizeObserver |
| 颜色 | CIELAB 色彩空间（sRGB→Linear RGB→XYZ→CIELAB 管线） |
| 动画 | anime.js 4.4.1 |
| PDF | jsPDF |

## 项目结构

```
src/
├── components/
│   ├── Header.tsx              # 顶部标题栏 + anime.js 入场动画
│   ├── ImageCropper.tsx        # Canvas 拖拽裁剪弹窗
│   ├── BeadGridCanvas.tsx      # 图谱渲染 + 编辑交互 + ResizeObserver
│   ├── Sidebar.tsx             # 可折叠面板 (48px图标栏 ↔ 320px设置面板)
│   ├── ColorPicker.tsx         # 调色板选择弹窗
│   ├── CleanupDialog.tsx       # 去除杂色弹窗
│   ├── ColorStats.tsx          # 底部颜色统计栏
│   └── ui/                     # 交互组件
│       ├── ClickSpark/         # 点击火花粒子反馈
│       └── Magnet/             # 磁吸跟随效果
├── hooks/
│   └── useDialogAnimation.ts   # anime.js 弹窗动画 Hook
├── utils/
│   ├── colorPalette.ts         # 6 品牌 645 色数据
│   ├── colorMatcher.ts         # CIELAB 匹配 + 限色算法
│   ├── imageProcessor.ts       # 图片处理管线
│   └── exportManager.ts        # PNG/PDF/SVG/CSV/JSON 导出
├── types/index.ts              # 核心类型与常量
├── App.tsx                     # 主应用（状态管理 + 流程编排）
├── main.tsx                    # 入口
└── index.css                   # Tailwind + CSS 变量 + 暖调配色
```

## 开发

```bash
# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 预览构建结果
npm run preview
```

> 本项目为纯前端应用，直接在浏览器中运行，无后端依赖。

## License

MIT
