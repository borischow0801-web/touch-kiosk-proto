# deploy

## Docker Compose 部署
```bash
docker compose up -d --build
```

- Web: http://<server-ip>/
- API: http://<server-ip>/api/health

> 说明：frontend 容器构建 dist 并拷贝到共享卷 frontend_dist，nginx 读取该卷提供静态站点。
