# EchoNotes 配置变更记录

## 2026-02-19 - Supabase 配置变量名更新

### 变更内容

为了适配 Supabase 新的 API key 命名规范，同时保持向后兼容性，我们对配置变量进行了更新：

| 原变量名 | 新变量名 | 说明 |
|---------|---------|------|
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `EXPO_PUBLIC_SUPABASE_KEY` | 更通用的命名，支持 publishable key 或 legacy anon key |

### 受影响文件

1. **`src/lib/supabase.ts`** (line 25, 27)
   - 变量名从 `supabaseAnonKey` 改为 `supabaseKey`

2. **`.env.example`**
   - 示例配置已更新

3. **`.env`**
   - 请同步更新你的本地配置

### Supabase Key 说明

根据 [Supabase 官方文档](https://supabase.com/docs/guides/api/api-keys)：

#### 推荐使用（新格式）
- **Publishable Key**: 格式为 `sb_publishable_...`
  - ✅ 安全用于前端
  - ✅ 更易于管理和轮换
  - ✅ 官方推荐

#### 仍然兼容（旧格式）
- **Legacy Anon Key**: JWT 格式（以 `eyJ` 开头）
  - ✅ 仍然可用
  - ⚠️ 建议逐步迁移到 publishable key

### 如何更新

#### 1. 获取 Supabase 凭证

进入你的 Supabase 项目 → **Settings** → **API**：

| 获取项 | 说明 |
|--------|------|
| **Project URL** | 填入 `EXPO_PUBLIC_SUPABASE_URL` |
| **Publishable Key** (推荐) | 填入 `EXPO_PUBLIC_SUPABASE_KEY` |
| 或 **Legacy Anon Key** (兼容) | 也可填入 `EXPO_PUBLIC_SUPABASE_KEY` |

#### 2. 运行数据库迁移

在 Supabase **SQL Editor** 中执行：
```bash
supabase/migrations/001_initial.sql
```

#### 3. 更新 .env 文件

编辑 `.env`：
```env
EXPO_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...  # 或你的 legacy anon key
```

### 其他相关配置

#### LLM 提供商配置

在应用内的 **Settings** 页面配置：

| 提供商 | API Key 获取地址 |
|--------|-----------------|
| Claude (Anthropic) | https://console.anthropic.com |
| OpenAI | https://platform.openai.com |
| Kimi (Moonshot) | https://platform.moonshot.cn |
| Qwen (Alibaba) | https://dashscope.aliyuncs.com |
| Zhipu AI (ZAI) | https://open.bigmodel.cn |
| Ollama (本地) | 无需 key，配置 Base URL |

### 常见问题

**Q: 我可以继续用旧的 anon key 吗？**  
A: 可以！两者都兼容，建议后续迁移到 publishable key。

**Q: 忘记配置 Supabase 会怎样？**  
A: 应用会卡在登录页，无法进入主界面。

**Q: 需要重启应用吗？**  
A: 修改 `.env` 后需要重启开发服务器才能生效。
