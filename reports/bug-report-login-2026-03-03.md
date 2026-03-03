# 登录功能 Bug 报告

**测试日期：** 2026-03-03
**测试人员：** Logan (QA)
**版本：** EchoNote MVP

---

## P0 - 密码暴露在 URL 参数中（安全漏洞）

### 严重程度
🔴 **P0 - 致命**（安全漏洞）

### 问题描述
登录表单提交时，邮箱和密码被编码到 URL 查询参数中，而非通过 POST 请求体发送。

### 复现步骤
1. 访问 `/login` 页面
2. 输入邮箱：`test@echonote.app`
3. 输入密码：`TestPassword123!`
4. 点击「登录」按钮

### 实际结果
URL 变为：
```
http://localhost:3001/login?email=test%40echonote.app&password=TestPassword123%21
```

### 预期结果
- URL 应保持为 `/login` 或跳转到 `/dashboard`
- 密码应通过 HTTPS POST 请求体发送，绝不应出现在 URL 中

### 安全风险
1. **浏览器历史记录**：密码保存在浏览器历史中
2. **服务器日志**：Web 服务器访问日志会记录完整 URL
3. **网络监控**：任何网络监控工具都能看到明文密码
4. **Referer 泄露**：跳转到其他页面时可能通过 Referer 头泄露

### 根因分析
表单未正确阻止默认提交行为，导致浏览器使用默认的 GET 方法提交表单数据到 URL。

### 修复建议
检查 `onSubmit` 处理：
```tsx
// 确保使用 handleSubmit 包裹
<form onSubmit={handleSubmit(onSubmit)}>
// 不使用 <button type="submit"> 或者确保 handleSubmit 正确工作
```

---

## P1 - API 响应字段不匹配

### 严重程度
🟠 **P1 - 严重**

### 问题描述
前端代码尝试读取 `result.token`，但后端 API 返回的是 `access_token`。

### 后端响应
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### 前端代码
```tsx
if (result.token) {
  localStorage.setItem("token", result.token);
}
```

### 影响
- Token 无法存储到 localStorage
- 用户登录状态无法保存
- 登录后无法正确跳转

### 修复建议
前端代码应读取 `result.access_token`：
```tsx
if (result.access_token) {
  localStorage.setItem("token", result.access_token);
}
```

---

## P1 - 表单提交方式错误

### 严重程度
🟠 **P1 - 严重**

### 问题描述
表单似乎触发了浏览器的默认表单提交行为（GET 请求到当前 URL），而非 JavaScript fetch 请求。

### 可能原因
1. `handleSubmit` 未正确绑定
2. Button 的 `type="submit"` 触发了默认行为
3. 事件处理顺序问题

### 验证
- 网络面板未看到 POST 请求到 `/api/auth/login`
- URL 参数被编码到查询字符串

### 修复建议
1. 确保 `handleSubmit` 正确包裹 `onSubmit`
2. 添加 `event.preventDefault()` 或确保 react-hook-form 正确处理

---

## 测试环境

- 前端：http://localhost:3001
- 后端：http://localhost:8000
- 浏览器：Chromium (Playwright)

---

## 下一步

1. @Bernard 修复 P0 安全漏洞（优先）
2. 修复 API 响应字段匹配
3. 重新测试登录流程

---

## P1 - 服务端模块缺失

### 严重程度
🟠 **P1 - 严重**

### 问题描述
登录提交后，Next.js 服务端报错：`Cannot find module './429.js'`

### 错误信息
```
Error: Cannot find module './429.js'
Require stack:
- /Users/owenfff/EchoNote/frontend/.next/server/webpack-runtime.js
- /Users/owenfff/EchoNote/frontend/.next/server/app/not-found.js
```

### 根因分析
Next.js 构建缓存损坏，`.next/server/` 目录缺少必要的模块文件。

### 修复建议
```bash
cd /Users/owenfff/EchoNote/frontend
rm -rf .next
npm run dev
```

### 影响
- 登录提交后显示服务端错误页面
- 用户无法完成登录流程

---

## ✅ 已修复 - 密码暴露在 URL 参数中（安全漏洞）

### 严重程度
🔴 **P0 - 致命**（安全漏洞）

### 问题描述
登录表单提交时，邮箱和密码被编码到 URL 查询参数中，而非通过 POST 请求体发送。

### 复现步骤
1. 访问 `/login` 页面
2. 输入邮箱：`test@echonote.app`
3. 输入密码：`TestPassword123!`
4. 点击「登录」按钮

### 实际结果（修复前）
URL 变为：
```
http://localhost:3001/login?email=test%40echonote.app&password=TestPassword123%21
```

### 实际结果（修复后）
URL 正确跳转到首页 `/`，密码未出现在 URL 中。

### 修复内容
```diff
- const onSubmit = async (data: LoginFormData) => {
+ const onSubmit = async (data: LoginFormData, e?: React.BaseSyntheticEvent) => {
+   e?.preventDefault();
```

### 验证时间
2026-03-03 04:38

---

## ✅ 已修复 - API 响应字段不匹配

### 严重程度
🟠 **P1 - 严重**

### 问题描述
前端代码尝试读取 `result.token`，但后端 API 返回的是 `access_token`。

### 修复内容
```diff
- if (result.token) {
+ const token = result.access_token || result.token;
+ if (token) {
    localStorage.setItem("token", token);
+   window.location.href = "/";
```

### 验证时间
2026-03-03 04:38

---

**状态：** ✅ 所有 Bug 已修复，测试通过