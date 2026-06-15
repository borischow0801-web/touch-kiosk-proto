# touch-kiosk-proto

一个“竖屏触摸屏政务查询”原型工程（前端 Vue3 + 后端 Fastify），支持：
- 首页常用事项（大按钮）
- 按部门/按主题浏览事项
- 事项详情（材料/流程/地点/时间）
- 90 秒无操作自动回首页
- 全程不使用系统键盘输入

## 本地开发（推荐）
### 后端
```bash
cd backend
npm i
npm run dev
```
后端默认：http://localhost:3100

### 群众端
```bash
cd kiosk-app
npm i
npm run dev
```
群众端默认：http://localhost:5183（已代理 /api 到 3100）

### 管理端
```bash
cd admin-web
npm i
npm run dev
```
管理端默认：http://localhost:5184（已代理 /api 到 3100）

## 生产部署（Docker Compose）
```bash
cd deploy
docker compose up -d --build
```
访问：http://<server-ip>/
