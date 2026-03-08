# koikoi 项目研究报告

## 1. 项目结论

这是一个基于 Vue 3 + Vite 构建的“花札来来（Koi-Koi）”Web 客户端。它不是完整游戏，而是一个前端展示与交互层：

- 前端负责大厅、牌桌、吃牌区、回合提示、役成立提示、结算弹窗等 UI。
- 游戏规则判定、回合推进、房间管理、役计算、总分累计等核心逻辑都假定由后端 WebSocket 服务负责。
- 前端代码中的状态被明确标注为“服务端权威”，说明客户端主要承担“接收状态 -> 映射到界面 -> 发送用户操作”的职责。

从代码结构看，这个仓库更像是一个移动端优先的双人对战前端原型/可用客户端，而不是带完整规则引擎的单体应用。

## 2. 技术栈与基础配置

### 2.1 技术栈

- Vue `^3.4.0`
- Vite `^5.0.0`
- `@vitejs/plugin-vue` `^5.0.0`

### 2.2 关键配置

`package.json` 只定义了 3 个脚本：

- `npm run dev`: 启动 Vite 开发服务器
- `npm run build`: 生产构建
- `npm run preview`: 预览构建产物

`vite.config.js` 中的配置很少：

- 开启 Vue 插件
- 开发服务器监听 `0.0.0.0`
- 端口固定为 `5173`

这说明项目整体复杂度较低，没有接入 ESLint、TypeScript、测试框架、状态库、路由或 UI 库。

## 3. 仓库结构

仓库核心文件如下：

```text
index.html
package.json
vite.config.js
scripts/fetch-cards.js
public/cards/*.svg
src/main.js
src/App.vue
src/style.css
src/composables/useGame.js
src/composables/useWebSocket.js
src/components/Lobby.vue
src/components/Card.vue
src/components/Field.vue
src/components/Hand.vue
src/components/Captures.vue
```

职责划分很清晰：

- `src/composables/useGame.js`: 业务状态中心，负责把 WebSocket 消息翻译成前端状态，并暴露用户动作。
- `src/composables/useWebSocket.js`: 连接管理层。
- `src/components/*.vue`: UI 组件层。
- `public/cards/*.svg`: 48 张花札卡牌静态资源。
- `scripts/fetch-cards.js`: 从 Wikimedia 拉取卡图的辅助脚本。

## 4. 应用启动与运行方式

### 4.1 启动流程

入口非常简单：

1. `index.html` 提供 `#app` 挂载点，并设置移动端相关 meta。
2. `src/main.js` 创建 Vue 应用并挂载 `App.vue`。
3. `App.vue` 调用 `useGame()` 获取所有状态与动作，决定渲染大厅还是牌桌。

### 4.2 运行形态

应用只有两个大的 UI 模式：

- 大厅/等待模式
- 对局模式

没有 URL 路由，整个应用是单屏状态机。

## 5. 功能定位与用户流程

### 5.1 典型用户流程

按代码推断，预期流程如下：

1. 用户进入大厅。
2. 可选择创建房间或输入房间号加入房间。
3. 前端通过 WebSocket 向服务器发送房间操作。
4. 服务端返回房间状态和玩家编号。
5. 游戏开始后，服务端不断推送完整或准完整游戏状态。
6. 当前玩家点击手牌出牌。
7. 若服务端要求从场牌中二选一/多选一，前端显示可匹配候选牌。
8. 若形成役，前端播放震动、显示役提示。
9. 若进入来来/停止抉择，前端弹出选择框。
10. 回合结束显示本局得分；整场结束显示总胜负。

### 5.2 明确不是前端负责的内容

以下内容没有在前端实现规则逻辑，只是消费服务端结果：

- 发牌
- 场上配对规则
- 抽牌逻辑
- 收牌分类
- 役判定
- 文数计算
- 回合轮转
- 局数推进
- 游戏结束判断

## 6. WebSocket 协议与通信模型

### 6.1 连接地址

`src/composables/useWebSocket.js` 中：

- 默认地址：`ws://localhost:8080`
- 可通过环境变量 `VITE_WS_URL` 覆盖

说明这个仓库默认依赖本地后端服务，生产环境需要显式提供 WebSocket 地址。

### 6.2 客户端发送的消息

前端会发送以下消息：

- `CREATE_ROOM`
- `JOIN_ROOM`
  - 附带 `roomCode`
- `PLAY_HAND_CARD`
  - 附带 `cardId`
- `SELECT_FIELD_CARD`
  - 附带 `cardId`
- `KOI_KOI_DECISION`
  - 附带 `callKoi: true/false`
- `PING`

这说明服务端协议是 JSON 文本协议，消息风格接近“命令 + 载荷”。

### 6.3 客户端处理的服务端消息

前端显式处理这些消息类型：

- `ROOM_CREATED`
- `ROOM_JOINED`
- `GAME_START`
- `GAME_STATE`
- `YAKU_FORMED`
- `ROUND_RESULT`
- `GAME_OVER`
- `OPPONENT_LEFT`
- `ERROR`

### 6.4 服务端状态载荷结构

根据 `applyState()` 可以反推出服务端状态对象大致包含：

- `playerIndex`
- `field`
- `hands`
  - `hands[pi].cards`
  - `hands[other].count`
- `drawPileCount`
- `captures`
- `currentPlayer`
- `phase`
- `matchCandidates`
- `drawnCard`
- `koiCalled`
- `roundScores`
- `totalScores`
- `round`
- `totalRounds`

前端明显假设服务端会提供“我方手牌详情 + 对方手牌数量”这种视角裁剪后的状态，而不是把双方完整手牌都发给客户端。

## 7. 前端状态模型

`useGame()` 是本项目最核心的文件。

### 7.1 顶层状态

#### 网络/大厅状态

- `phase`
  - 注释写的是 `lobby | waiting | playing | roundResult | gameOver`
  - 实际代码主要只用到 `lobby`、`waiting`、`playing`
- `roomCode`
- `myPlayerIndex`
- `message`

#### 游戏状态

- `field`
- `myHand`
- `oppHandCount`
- `drawPileCount`
- `myCaptures`
- `oppCaptures`
- `currentPlayer`
- `gamePhase`
- `matchCandidates`
- `drawnCard`
- `koiCalled`
- `roundScores`
- `totalScores`
- `currentRound`
- `totalRounds`

#### UI 状态

- `selectedCard`
- `newYaku`
- `showYakuBanner`
- `showRoundResult`
- `showGameOver`
- `roundWinner`
- `opponentLeft`

### 7.2 派生状态

#### `isMyTurn`

通过 `currentPlayer === myPlayerIndex` 判断当前是否是自己回合。

#### `matchableIds`

仅在以下条件满足时计算：

- 是自己回合
- 当前子阶段是 `selectHandCard`

算法是：

1. 从场牌提取所有月份。
2. 找出自己手牌中月份与场牌重复的牌。
3. 返回这些牌 `id` 的 `Set`。

这说明 UI 允许高亮“可能可配对”的手牌，但是否真的能打、打出后是否需要进一步选择场牌，最终仍由服务端决定。

## 8. 状态机与界面切换

### 8.1 顶层 phase

`App.vue` 用 `phase` 控制根视图：

- `lobby` 或 `waiting` -> 渲染 `Lobby`
- 否则 -> 渲染游戏牌桌

### 8.2 游戏内部子阶段 `gamePhase`

前端显式依赖的子阶段有：

- `selectHandCard`
- `selectFieldMatch`
- `drawPhase`
- `koiKoiDecision`

对应含义可推断为：

- `selectHandCard`: 轮到玩家选择一张手牌打出
- `selectFieldMatch`: 打出手牌后，如果场上有多张同月牌，需要玩家指定吃哪张
- `drawPhase`: 抽牌后也可能触发场牌选择
- `koiKoiDecision`: 形成新役后，选择继续或停止

### 8.3 显示层状态与业务状态分离

`showRoundResult`、`showGameOver` 不是由 `phase` 控制，而是额外 UI flag。

这意味着：

- 顶层 still 处于 `playing`
- 但通过 modal 覆盖层展示结算

这种设计简化了视图切换，但也会造成顶层 `phase` 注释与实际逻辑不完全一致。

## 9. 组件职责分析

### 9.1 `App.vue`

这是总装配层，负责：

- 大厅与游戏牌桌的切换
- 对手区域、场地、自己区域的布局
- 各种弹窗与提示层
- 从 `useGame()` 拉取所有状态与动作

牌桌分为三块：

- 顶部：对手手牌 + 对手吃牌区
- 中间：场牌区 + 牌堆 + 抽到的牌
- 底部：自己吃牌区 + 自己手牌

叠加层包括：

- 状态 toast
- 役成立 banner
- 来来/停止选择框
- 回合结算/整局结算框
- 对手离线提示框

### 9.2 `Lobby.vue`

大厅负责：

- 创建房间
- 输入房间号加入
- 等待好友加入的展示
- 首次挂载时预加载卡图

UI 风格是偏移动端的居中单卡片布局。

### 9.3 `Card.vue`

卡牌组件支持四种重要视觉状态：

- `matchable`: 可配对高亮
- `selected`: 已选中
- `disabled`: 被禁用/灰显
- `facedown`: 背面朝上

图片路径规则为：

- `/cards/${card.id}.svg`

这意味着前端把服务端卡牌 `id` 直接当成静态资源文件名。该假设非常强，要求服务端卡牌编号和 `public/cards` 中 0-47 的资源编号严格一致。

若图片加载失败，会用 emoji 回退渲染。

### 9.4 `Field.vue`

场牌区负责：

- 显示场上卡牌
- 显示牌堆数量
- 显示背面朝上的牌堆
- 显示刚抽到的牌
- 根据 `matchCandidates` 标记哪些场牌可选

布局默认按：

- 上排 4 张
- 中间牌堆/抽牌
- 下排 4 张
- 超过 8 张时追加额外行

这是一种对花札常见桌面布局的简化。

### 9.5 `Hand.vue`

手牌区负责：

- 自己手牌的横向排列
- 对手手牌的背面牌显示
- 选中/禁用状态动画

它使用 `TransitionGroup` 实现手牌移动和出牌过渡。

### 9.6 `Captures.vue`

吃牌区负责：

- 显示玩家当前累计文数
- 按牌类型分组展示已吃的牌
- 预留役标签展示

分组依据是 `card.type`：

- `hikari`
- `tane`
- `tanzaku`
- `kasu`

这说明服务端传来的 `captures` 牌对象应至少包含：

- `id`
- `type`
- 大概率还包含 `month`、`label`、`emoji`

## 10. 视觉与交互设计特点

### 10.1 总体风格

项目视觉方向比较明确：

- 深色背景
- 玻璃拟态/半透明面板
- 青色高亮
- 红金色强调
- 移动端尺寸优先

### 10.2 针对触屏设备的设计

`index.html` 与 CSS 明显偏向移动 Web：

- 禁止页面缩放
- `apple-mobile-web-app-capable`
- `overflow: hidden`
- `touch-action: manipulation`
- 手牌区和吃牌区允许横向/纵向滚动但隐藏滚动条

### 10.3 动效与反馈

项目包含较多轻量动效：

- 大厅等待 spinner
- toast / banner / modal 过渡
- 手牌 FLIP 动画
- 吃牌区 FLIP 动画
- 抽牌入场动画
- 卡牌呼吸高亮

另外还调用 `navigator.vibrate` 提供：

- 役成立震动
- 轻触出牌震动
- 确认配牌震动

## 11. 静态资源系统

### 11.1 卡牌资源

`public/cards` 中有 48 张 SVG，对应 12 月 × 每月 4 张花札。

编号规则由 `scripts/fetch-cards.js` 硬编码定义，顺序是：

- 1 月的 4 张牌对应 `0-3`
- 2 月对应 `4-7`
- ...
- 12 月对应 `44-47`

### 11.2 拉取方式

脚本从 Wikimedia Commons 下载 SVG：

- 逐张顺序下载
- 每张之间延迟 1 秒，避免 429
- 已存在且文件大于一定大小时跳过
- 支持处理 3xx 重定向

这个脚本的作用不是运行时逻辑，而是构建素材库。

### 11.3 关键隐含假设

前端强依赖“卡图文件编号 == 服务端卡牌 id”。如果后端使用另一套编号系统，界面会显示错牌。

这是当前实现中一个非常重要的协议约束。

## 12. 服务端契约推断

虽然仓库没有后端代码，但可以比较清晰地反推出后端必须提供的能力。

### 12.1 房间系统

后端至少需要支持：

- 创建房间
- 加入房间
- 标识当前玩家是 0 号还是 1 号
- 对手离线通知

### 12.2 状态广播

后端需要在关键节点广播：

- 游戏开始
- 每次出牌、配对、抽牌后的最新状态
- 役形成事件
- 小局结果
- 整场结果

### 12.3 视角裁剪

后端返回状态时应该：

- 只给当前客户端自己的完整手牌
- 只给对手手牌数量而不是具体内容

否则前端当前的数据读取逻辑会不匹配。

## 13. 当前实现中的关键问题与风险

下面是我在阅读代码后确认到的重要问题。

### 13.1 `createRoom()` / `joinRoom()` 存在发送时序风险

代码是：

1. `connect()`
2. 紧接着 `send(...)`

但 `send()` 只有在 `WebSocket.OPEN` 时才真正发送。`connect()` 是异步的，所以在多数真实环境里，首条 `CREATE_ROOM` 或 `JOIN_ROOM` 很可能在连接尚未建立时被直接丢弃。

这意味着：

- 用户点击“创建房间”后，消息可能没有发出去
- 用户点击“加入房间”后，消息也可能没有发出去
- 代码没有消息队列，也没有在 `onopen` 后补发

这是当前最严重的功能性问题之一。

### 13.2 `ROOM_JOINED` 后没有切到 `waiting`

收到 `ROOM_JOINED` 时，代码只做了：

- 设置 `myPlayerIndex`
- 设置 `roomCode`
- 设置提示信息

但没有设置 `phase = 'waiting'`。

结果是加入方在成功加入后仍停留在大厅表单界面，而不是宿主玩家看到的等待界面。这会导致：

- 视觉状态不一致
- 用户体验困惑
- 逻辑上“已加入等待开局”却还显示“创建/加入”操作

### 13.3 `Lobby.vue` 中再次调用 `useGame()`，产生第二份状态实例

`App.vue` 已经调用了一次 `useGame()` 作为主状态源，但 `Lobby.vue` 为了调用 `preloadAssets()` 又再次调用了一次 `useGame()`。

这不会共享状态，因为 `useGame()` 不是单例 store，而是普通 composable 工厂。当前之所以“看起来没坏”，仅仅因为：

- `preloadAssets()` 只依赖全局 `window.__KOIKOI_PRELOADED`
- 它不读取那份新实例的业务状态

因此这是一个设计异味：

- 当前碰巧可用
- 但它容易让后续维护者误以为 `useGame()` 是全局共享状态

### 13.4 `requestIdleCallback` 没有降级方案

`preloadAssets()` 直接调用 `requestIdleCallback()`。

如果运行环境不支持该 API，预加载逻辑会报错。更稳妥的做法通常是：

- 检查 API 是否存在
- 不存在时回退到 `setTimeout`

### 13.5 WebSocket 层缺少健壮性机制

当前 WebSocket 管理非常轻量，缺少以下能力：

- 自动重连
- 首包缓存/发送队列
- 异常关闭原因处理
- PING/PONG 超时判断
- JSON 解析错误日志
- 连接状态反馈到 UI

`status` 虽然有返回，但主 UI 几乎没有利用它。

### 13.6 `myCapturesYakuNames` 实际未实现

`App.vue` 中有一个计算属性 `myCapturesYakuNames`，但实际固定返回空数组。

这说明：

- 吃牌区右上角的役标签展示其实没有完成
- 当前只在 `YAKU_FORMED` 时短暂弹出 banner
- 无法持久显示“当前已经成立的役”

### 13.7 `koiCalled` 状态被保存但未使用

`useGame()` 接收并保存了 `koiCalled`，但 UI 完全没消费这个值。

这通常说明：

- 原计划展示双方是否已叫过来来
- 或者该字段只是为将来预留

目前属于未完成/未接通状态。

### 13.8 顶层 `phase` 注释与实际使用不一致

注释说 `phase` 可能有：

- `lobby`
- `waiting`
- `playing`
- `roundResult`
- `gameOver`

但实际：

- 结算和终局并不通过 `phase` 切换
- 而是靠 `showRoundResult` / `showGameOver` 控制 overlay

这不会立刻导致 bug，但会降低可维护性，因为注释表达的状态机与实际代码不一致。

### 13.9 回到大厅时没有彻底清空游戏数据

`backToLobby()` 只重置部分 UI 标志，并断开连接，但没有清空：

- `field`
- `myHand`
- `captures`
- `scores`
- `drawnCard`

虽然切回大厅后这些旧数据不会立刻显示，但它们仍残留在内存里。若以后大厅或其他组件开始读取这些值，可能出现脏状态问题。

## 14. 代码质量观察

### 14.1 优点

- 目录小，职责边界清楚
- 核心状态集中在一个 composable，易于追踪
- UI 组件拆分合理，没有过度抽象
- 服务端权威思路明确，前端没有重复实现复杂游戏规则
- 移动端体验考虑得比较充分

### 14.2 局限

- 没有类型系统，协议字段全靠约定
- 没有测试
- 没有 README 或开发文档
- 没有错误恢复机制
- 协议层较脆弱，隐含假设很多

## 15. 本地验证结果

我在本地做了两步验证：

### 15.1 安装依赖

执行 `npm install` 成功。

结果：

- 依赖可以正常安装
- `npm audit` 提示 2 个 moderate 级别问题，但当前未继续深挖依赖漏洞细节

### 15.2 生产构建

执行 `npm run build` 成功，生成了 `dist/`：

- `dist/index.html`
- `dist/assets/index-*.css`
- `dist/assets/index-*.js`

说明：

- 代码在语法与打包层面是成立的
- 当前问题主要集中在运行时协议和状态管理，而不是构建错误

另外，构建时出现一条 Vite 的 CJS Node API deprecation 提示，但不影响当前打包成功。

## 16. 我对这个项目工作方式的最终理解

可以把它概括成一句话：

> 这是一个依赖后端状态驱动的双人花札 Koi-Koi 对战前端，前端主要承担“房间交互 + WebSocket 收发 + 状态映射 + 动效展示”的职责，而不是负责规则演算。

它的真实工作方式是：

1. 用户通过大厅发起或加入对局。
2. 前端通过 WebSocket 向服务端发送动作。
3. 服务端维护真实牌局并回推状态。
4. 前端把状态拆成手牌、场牌、吃牌区、局数、文数、候选牌、当前子阶段等可视信息。
5. 用户继续操作，形成一个“服务端驱动、前端渲染”的循环。

从实现成熟度看，它已经具备一个可运行客户端的骨架和大部分交互体验，但仍处于“协议约定强、健壮性不足、少量逻辑尚未打磨完成”的阶段。

## 17. 若后续继续完善，最优先的改进项

如果要继续开发，这几个方向优先级最高：

1. 修复 WebSocket 首包丢失问题，为 `connect()` 建立发送队列或 `onopen` 回调发首包。
2. 修复 `ROOM_JOINED` 后 phase 未切换到 `waiting` 的问题。
3. 把 `useGame()` 改造成单例 store，或将 `preloadAssets()` 提取为独立工具函数，避免重复实例化。
4. 为 `requestIdleCallback` 加兼容降级。
5. 为服务端协议补充文档或 TypeScript 类型定义。
6. 明确并文档化“卡牌资源编号与服务端 id 的映射规则”。
7. 补齐持久役显示、重连策略、错误提示和状态清理。

---

以上内容基于对当前仓库全部源码、配置、静态资源与辅助脚本的逐文件阅读得出。
