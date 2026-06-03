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
后端默认：http://localhost:3000

### 前端
```bash
cd frontend
npm i
npm run dev
```
前端默认：http://localhost:5173 （已代理 /api 到 3000）

## 生产部署（Docker Compose）
```bash
cd deploy
docker compose up -d --build
```
访问：http://<server-ip>/
