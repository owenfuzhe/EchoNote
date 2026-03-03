# EchoNote API 文档

## 认证 API (Authentication API)

所有认证相关的端点都以 `/api/auth` 为前缀。

---

## 基础信息

- **Base URL**: `http://localhost:8000`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

---

## 端点列表

### 1. 用户注册

**POST** `/api/auth/register`

使用邮箱和密码注册新用户。

#### 请求参数

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `email` | string | ✓ | 有效的邮箱地址 |
| `password` | string | ✓ | 密码（8-128位，需包含大小写字母和数字） |
| `full_name` | string | ✗ | 用户显示名称 |

#### 请求示例

```json
{
  "email": "user@example.com",
  "password": "Test123456",
  "full_name": "张三"
}
```

#### 成功响应 (201 Created)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "张三",
    "provider": "email",
    "is_verified": false,
    "created_at": "2026-03-02T12:00:00"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

#### 错误响应

- **409 Conflict**: 邮箱已被注册
- **422 Unprocessable Entity**: 密码格式不符合要求

---

### 2. 用户登录

**POST** `/api/auth/login`

使用邮箱和密码登录。

#### 请求参数

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `email` | string | ✓ | 注册邮箱 |
| `password` | string | ✓ | 用户密码 |

#### 请求示例

```json
{
  "email": "user@example.com",
  "password": "Test123456"
}
```

#### 成功响应 (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "张三",
    "provider": "email",
    "is_verified": false,
    "created_at": "2026-03-02T12:00:00"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

#### 错误响应

- **401 Unauthorized**: 邮箱或密码错误
- **403 Forbidden**: 账户已停用

---

### 3. Google OAuth 登录

**POST** `/api/auth/google`

通过 Google OAuth 登录或注册。

#### 请求参数

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | string | ✓ | Google 授权码 |
| `redirect_uri` | string | ✓ | OAuth 重定向 URI（需与请求时一致） |

#### 请求示例

```json
{
  "code": "4/0Adeu5BXr8...",
  "redirect_uri": "http://localhost:3000/auth/callback"
}
```

#### 成功响应 (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@gmail.com",
    "full_name": "张三",
    "provider": "google",
    "is_verified": true,
    "created_at": "2026-03-02T12:00:00"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

#### 错误响应

- **400 Bad Request**: 无效的授权码

---

### 4. Apple OAuth 登录

**POST** `/api/auth/apple`

通过 Apple OAuth 登录或注册。

#### 请求参数

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | string | ✓ | Apple 授权码 |
| `id_token` | string | ✓ | Apple ID Token (JWT) |
| `user` | object | ✗ | 用户信息（仅首次登录时提供） |

#### 请求示例

```json
{
  "code": "c8a5d5b0e4...",
  "id_token": "eyJraWQiOiJmaDZCczhDI...",
  "user": {
    "name": {
      "firstName": "三",
      "lastName": "张"
    },
    "email": "user@privaterelay.appleid.com"
  }
}
```

#### 成功响应 (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@privaterelay.appleid.com",
    "full_name": "张 三",
    "provider": "apple",
    "is_verified": true,
    "created_at": "2026-03-02T12:00:00"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

#### 错误响应

- **400 Bad Request**: 无效的 Token

---

### 5. Token 刷新

**POST** `/api/auth/refresh`

使用 Refresh Token 获取新的 Access Token。

#### 请求参数

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `refresh_token` | string | ✓ | 有效的 Refresh Token |

#### 请求示例

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 成功响应 (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### 错误响应

- **401 Unauthorized**: Token 无效或已过期
- **401 Unauthorized**: Token 已被撤销（用户登出）

---

### 6. 用户登出

**POST** `/api/auth/logout`

登出当前用户，使所有 Refresh Token 失效。

#### 认证要求
- **Header**: `Authorization: Bearer <access_token>`

#### 请求参数

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `refresh_token` | string | ✗ | 可选，指定要撤销的设备 Token |

#### 请求示例

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json"
```

#### 成功响应 (200 OK)

```json
{
  "message": "Successfully logged out"
}
```

---

### 7. 获取当前用户信息

**GET** `/api/auth/me`

获取当前登录用户的信息。

#### 认证要求
- **Header**: `Authorization: Bearer <access_token>`

#### 请求示例

```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### 成功响应 (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "full_name": "张三",
  "provider": "email",
  "is_verified": true,
  "created_at": "2026-03-02T12:00:00"
}
```

#### 错误响应

- **401 Unauthorized**: 未提供或无效的 Token
- **404 Not Found**: 用户不存在

---

## 数据模型

### Provider 枚举

```typescript
enum Provider {
  EMAIL = "email",    // 邮箱注册
  GOOGLE = "google",  // Google OAuth
  APPLE = "apple"     // Apple OAuth
}
```

### Token 类型

```typescript
enum TokenType {
  ACCESS = "access",    // 访问令牌（30分钟）
  REFRESH = "refresh"   // 刷新令牌（7天）
}
```

### User 对象

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | string | 用户唯一标识符 (UUID) |
| `email` | string | 用户邮箱 |
| `full_name` | string | 用户显示名称 |
| `provider` | Provider | 注册方式 |
| `is_verified` | boolean | 邮箱是否已验证 |
| `created_at` | datetime | 注册时间 |

### TokenData 对象

| 字段 | 类型 | 描述 |
|------|------|------|
| `access_token` | string | JWT 访问令牌 |
| `refresh_token` | string | JWT 刷新令牌 |
| `token_type` | string | 令牌类型，固定为 "bearer" |
| `expires_in` | number | 访问令牌过期时间（秒）|

---

## 认证流程

### 邮箱密码登录流程

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  Client │ ──POST /register──▶│  Server │ ──Create User────▶│   DB    │
│         │                    │         │                    │         │
│         │ ◀──Auth Response───│         │ ◀──────OK──────────│         │
│         │    (tokens+user)   │         │                    │         │
│         │                    │         │                    │         │
│         │ ──POST /login─────▶│         │ ──Verify Pass────▶│         │
│         │                    │         │                    │         │
│         │ ◀──Auth Response───│         │ ◀──────OK──────────│         │
│         │    (tokens+user)   │         │                    │         │
└─────────┘                    └─────────┘                    └─────────┘
```

### OAuth 登录流程

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Client │────▶│  OAuth  │────▶│  Client │────▶│  Server │
│         │Auth │Provider │Code │         │Code │         │
│         │◀────│         │◀────│         │◀────│         │
│         │     │         │     │         │     │ Verify  │
│         │     │         │     │         │     │  Token  │
│         │◀────────────────────────────────────│         │
│         │        Auth Response (tokens+user)   │         │
└─────────┘                                      └─────────┘
```

### Token 刷新流程

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│  Client │ ──POST /refresh──▶│  Server │ ──Verify Token───▶│   DB    │
│         │  (refresh_token)   │         │  (check version)   │         │
│         │                    │         │                    │         │
│         │ ◀──Token Data─────│         │ ◀──────OK──────────│         │
│         │  (new tokens)      │         │                    │         │
└─────────┘                    └─────────┘                    └─────────┘
```

---

## 环境变量配置

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/echonote

# JWT 密钥（生产环境必须更改）
JWT_SECRET_KEY=your-secret-key-change-in-production

# Token 过期时间
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple OAuth
APPLE_CLIENT_ID=your.apple.bundle.id
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

---

## 错误码对照表

| HTTP Status | Error Code | 描述 |
|-------------|------------|------|
| 200 | - | 请求成功 |
| 201 | - | 创建成功 |
| 400 | INVALID_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未授权（Token 无效或过期）|
| 403 | FORBIDDEN | 禁止访问（账户停用）|
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突（邮箱已注册）|
| 422 | VALIDATION_ERROR | 数据验证错误 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 测试

运行内置测试：

```bash
cd projects/EchoNote/backend
python auth.py
```

使用 pytest 运行：

```bash
pip install pytest pytest-asyncio httpx
pytest auth.py -v
```

启动开发服务器：

```bash
pip install fastapi sqlalchemy psycopg2-binary passlib python-jose httpx uvicorn
uvicorn auth:app --reload --port 8000
```

---

## 安全说明

1. **密码策略**: 密码必须包含至少1个大写字母、1个小写字母和1个数字
2. **Token 安全**: Access Token 有效期30分钟，Refresh Token 有效期7天
3. **Token 轮换**: 每次刷新后，旧的 Refresh Token 会被撤销
4. **全局登出**: 调用 `/logout` 会使所有设备的 Refresh Token 失效
5. **密码加密**: 使用 bcrypt 算法进行密码哈希
6. **JWT 签名**: 使用 HS256 算法进行 Token 签名

---

*文档版本: 1.0.0*  
*更新日期: 2026-03-02*
