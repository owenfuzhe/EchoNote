# Supabase Setup For EchoNote

## 这一步的目标

把 EchoNote 的核心笔记数据接到 Supabase，但先不强求你一次理解所有底层细节。

当前这版方案的重点是：

1. 用 Supabase 承担核心笔记数据
2. mobile 通过 `Project URL + Publishable key` 直接访问自己的数据
3. AI / 抓取继续保留在服务端能力里

## 代码里已经准备好的内容

- Supabase migration:
  - [20260317021500_init_echonote.sql](/Users/owenfff/EchoNote/supabase/migrations/20260317021500_init_echonote.sql)
- Mobile Supabase client:
  - [supabase.ts](/Users/owenfff/EchoNote/mobile/src/services/supabase.ts)
- Mobile notes remote service:
  - [supabase-notes.ts](/Users/owenfff/EchoNote/mobile/src/services/supabase-notes.ts)
- Mobile env example:
  - [mobile/.env.example](/Users/owenfff/EchoNote/mobile/.env.example)

## 为什么第一版没有把 tags / todos 单独拆表

因为当前项目更需要的是：

- 尽快打通云同步
- 保持移动端开发速度
- 避免为一条笔记的保存写复杂事务

所以第一版故意让 schema 更贴近当前 `Note` 结构：

- `tags` 先存在 `notes.tags`
- `todos` 先存在 `notes.todos_json`

这是一个偏务实的选择，不是终局设计。

## 你后面需要做的配置

### 1. 在 Supabase 里执行 migration

你可以二选一：

- 用 Supabase CLI 执行 `supabase db push`
- 或者直接把 migration SQL 粘到 Supabase SQL Editor 里执行

SQL 文件就是：

- [20260317021500_init_echonote.sql](/Users/owenfff/EchoNote/supabase/migrations/20260317021500_init_echonote.sql)

### 2. 在 mobile 里配置环境变量

参考：

- [mobile/.env.example](/Users/owenfff/EchoNote/mobile/.env.example)

你最终至少需要：

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url
```

### 3. 当前默认走匿名登录

为了先把云同步能力跑通，mobile 端目前会在 Supabase 已配置时优先尝试匿名登录。

这意味着：

- 用户不需要先手动注册
- 每个设备可以先获得一个独立的云端身份
- 后续再升级成正式账号

注意：

- 你需要在 Supabase 控制台开启 `Anonymous Sign-Ins`
- 如果未开启，app 会继续退回本地缓存/演示数据

官方参考：

- [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)

## 当前这一步的意义

这一步不是“功能已经全部完成”，而是把路线彻底走正：

- 数据底座开始对齐 Supabase
- 权限隔离开始对齐 RLS
- mobile 结构开始对齐云同步

后续我们就可以在这条路上继续做：

1. 登录
2. 云同步
3. AI 服务端化
4. 抓取任务服务化
