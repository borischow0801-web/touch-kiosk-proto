# 最简化部署说明（先看效果，不含 Docker）

> 目标：在本机或一台服务器上同时跑起前端和后端，用浏览器访问即可看到触摸屏政务查询原型效果。  
> 不涉及 Docker Compose、Nginx、生产环境优化，后续再考虑正式部署。

---

## 一、环境要求

- **Node.js**：LTS 版本（建议 18.x 或 20.x）
- **npm**：随 Node 安装即可

检查版本：

```bash
node -v   # 建议 v18.x 或 v20.x
npm -v
```

---

## 二、最简部署步骤（开发态，双进程）

用「后端 + 前端开发服务器」方式，前端已配置将 `/api` 代理到后端，无需改代码。

### 1. 启动后端

```bash
cd backend
npm install
npm run dev
```

- 后端默认：<http://localhost:3000>
- 看到类似 `Server listening at http://0.0.0.0:3000` 即表示启动成功

### 2. 启动前端（新开一个终端）

```bash
cd frontend
npm install
npm run dev
```

- 前端默认：<http://localhost:5173>
- 终端会给出本地访问地址

### 3. 访问页面

在浏览器中打开：**http://localhost:5173**

- 首页：6 个常用事项大按钮
- 底部导航：首页 / 返回 / 重来 / 帮助
- 可按部门、按主题进入事项列表与详情
- 约 90 秒无操作会自动回到首页

若在同一台机器上用手机或另一台电脑访问，请将 `localhost` 改为本机 IP（如 `http://192.168.x.x:5173`），并确保防火墙放行 5173 端口。

---

## 三、可选：构建后单进程运行（仅后端 + 静态文件）

若希望「只起一个后端进程」就同时提供页面和接口，可让后端托管前端构建产物。

### 1. 后端增加静态托管（一次性修改）

在 `backend/package.json` 的 `dependencies` 中增加：

```json
"@fastify/static": "^7.0.0"
```

在 `backend/src/index.ts` 中：

- 文件顶部增加：`import path from 'path'`、`import { fileURLToPath } from 'url'`、`import fastifyStatic from '@fastify/static'`
- 在**所有** `server.get('/api/...')`、`server.post(...)` 等路由注册**之后**，在 `server.listen` **之前**增加：

```ts
const __dirname = path.dirname(fileURLToPath(import.meta.url))
await server.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/',
})
server.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'))
```

这样：先匹配 API 路由，再匹配静态文件，其余请求（如 `/home`、`/depts`）由 SPA 回退到 `index.html`。

### 2. 构建前端并启动后端

```bash
# 先构建前端
cd frontend && npm install && npm run build && cd ..

# 再安装后端依赖并启动
cd backend && npm install && npm run build && npm start
```

访问：**http://localhost:3000** 即可同时看到页面和调用接口。

---

## 四、与《技术栈文档》的差异与可选补齐

| 项目 | TECH_STACK 要求 | 当前实现 | 说明 |
|------|-----------------|----------|------|
| API 分页 | `GET /api/items?page=1&pageSize=20` | 未实现 page/pageSize | 原型数据量小可忽略；后续可在后端对 `items` 做切片返回 |
| 数据存储 | P0 可选 SQLite 或 `data/*.json` | 内存 Mock 数据 | 当前为写死在代码中的对象，重启即重置；要持久化再接 SQLite 或读 JSON |
| 健康检查 | `GET /api/health` | 已实现 | 可直接用 |
| 前端资源本地化 | 不依赖公网 CDN | 已用本地 Tailwind/Vite 构建 | 构建产物可放在内网 |
| Nginx / 生产部署 | 推荐 Nginx + 反向代理 | 未包含在本最简方案 | 生产部署时再按 `deploy/` 或自有方案上 Nginx |

当前最简部署**不包含**：Docker、Nginx、HTTPS、Redis、PostgreSQL、限流与审计等，仅保证「前后端跑起来、浏览器能访问、功能可演示」。

---

## 五、常见问题

- **前端能打开但接口报错 / 404**  
  确认后端已启动在 3000 端口，且前端是用 `npm run dev` 启动（这样 Vite 会把 `/api` 代理到 3000）。

- **想用本机 IP 访问**  
  前端 dev 默认只监听 localhost，若需局域网访问，可在 `frontend/vite.config.ts` 的 `server` 中增加 `host: true`，然后通过 `http://<本机IP>:5173` 访问。

- **构建后单独打开 dist 里的 index.html**  
  会请求 `/api/...`，若未通过同一域名+端口的服务代理到后端，会跨域或 404。要么用「三、可选」方式让后端托管 dist，要么用 Nginx 等做同源+反向代理。

---

完成后即可在此基础上再规划生产环境（Docker Compose、Nginx、HTTPS 等）。
