# EchoNote MVP 部署检查清单

## 部署前确认

### 代码状态 ✅
- [x] 所有修复已合并到 main 分支
- [x] 代码已推送至远程仓库 (origin/main)
- [x] 最新 Commit: `a8f2deb`

### 配置文件 ✅
- [x] Dockerfile.frontend
- [x] Dockerfile.backend
- [x] docker-compose.yml
- [x] .github/workflows/ci-cd.yml
- [x] DEPLOYMENT.md

### 环境变量 ✅
- [x] backend/.env 已配置 API Key
- [x] KIMI_API_KEY: sk-sp-4fb688edd8f0492ba6488f9ff38298bb
- [x] KIMI_BASE_URL: https://api.bailian.com/v1

## 部署步骤

### 方式一：Docker Compose (推荐)
```bash
# 1. 克隆代码
git clone https://github.com/owenfuzhe/EchoNote.git
cd EchoNote

# 2. 启动服务
docker-compose up -d

# 3. 查看状态
docker-compose ps
docker-compose logs -f
```

### 方式二：CI/CD 自动部署
```bash
# 推送到 main 分支触发自动部署
git push origin main
```

## 验证清单

### 功能验证
- [ ] 首页加载正常
- [ ] 文字按钮跳转 /notes/new
- [ ] 搜索按钮跳转 /search
- [ ] AI 按钮跳转 /ai-assistant
- [ ] 资料库导航跳转 /notes
- [ ] 待办按钮跳转 /todos
- [ ] 更多按钮有响应
- [ ] 语音录音界面正常

### API 验证
- [ ] Health Check: http://localhost:8000/health
- [ ] API Docs: http://localhost:8000/docs
- [ ] AI Tags API: POST /api/ai/tags
- [ ] AI Summary API: POST /api/ai/summary
- [ ] Todo Extract API: POST /api/ai/extract-todos

## 访问地址

| 服务 | 地址 |
|------|------|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## 紧急回滚

```bash
# 查看历史版本
git log --oneline

# 回滚到指定版本
git revert <commit-hash>

# 重启服务
docker-compose restart
```

---

**部署时间:** 2026-03-04
**部署负责人:** Bernard
**验证负责人:** Logan
