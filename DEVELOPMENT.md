# Developer Guide: [Align]

## 1. environemnt setup
- **Node.js**
- **Package Manager** :https://pnpm.io/    / run "pnpm install"
- **Database:** Ensure Docker is installed and running. Execute `docker compose up -d` to start Postgres/Redis

#NOTES:
- Every time we update the shared type: "pnpm --filter @repo/shared exec tsc --watch"
    它会持续监听 src 的变化；你每次保存新的 type，dist 会自动更新，不需要重复手动执行 build。
    或者 每次都：“pnpm --filter @repo/shared build”

    原因：因为 apps/api 和前端读取的是 @repo/shared 的 dist/index.d.ts，不是直接读取 src。


## 2. 常用指令 (Scripts)
在项目根目录下，使用以下指令进行开发：

| 指令 | 描述 |
| :--- | :--- |
| `pnpm dev` | 启动所有应用 (Frontend & Backend) 的开发模式 (热更新)。 |
| `pnpm build` | 执行所有项目的生产构建。 |
| `pnpm check-types` | 全局运行 TypeScript 类型检查。 |
| `pnpm lint` | 执行代码格式与质量检查 (ESLint)。 |
| `pnpm --filter api start:dev` | **仅启动后端** (用于专注于后端开发时)。 |


## 3. Precautions (Best Practices)
### 前后端类型共享 (`packages/shared`)
- **核心原则**：所有需要前后端通用的接口 (`interface`) 和类型必须定义在 `packages/shared`。
- **使用方式**：在 `apps/web` 或 `apps/api` 中，使用 `import { ... } from "@repo/shared"`。
- **更新规范**：如果修改了共享类型，请务必执行 `pnpm check-types` 确保没有破坏任何地方的逻辑。


## 4. 开发工作流建议
1. **新建分支**：`git checkout -b feature/xxx`
2. **运行环境**：`docker compose up -d`
3. **开发**：`pnpm dev`
4. **提交代码前**：运行 `pnpm check-types` 和 `pnpm lint`。





##后端开发技巧：
2. 数据库可视化：Prisma Studio
既然你用了 Prisma，你就拥有了目前最强的数据库可视化工具。

如何使用：
在 apps/api 目录下直接运行：
npx prisma studio

可视化效果：
它会启动一个本地网页（通常是 http://localhost:5555），你可以在里面像操作 Excel 一样查看、添加、修改、删除你的 Postgres 数据表。这对调试极其有用，比如你写完注册接口，想确认数据库里是否真的多了一条用户信息，直接去 Studio 刷新一下即可。

3. API 测试工具：Postman 或 Bruno
虽然 Swagger 可以测接口，但对于复杂的请求（如登录、文件上传、WebSocket 测试），独立的客户端工具更专业。

推荐：Bruno (强烈推荐)

为什么：它比 Postman 更轻量，且所有接口配置是以文件夹形式存放在你的项目仓库里的（你可以把它放在 apps/api/test-requests），这样你们三人小组可以直接共享接口测试包，不用每个人手动重新配置。

4. 实时日志监控 (Console Visualization)
在终端运行 pnpm --filter api start:dev 时，Nest.js 的日志默认会输出在终端。

小技巧：如果想让日志更直观，可以在 Nest.js 中使用 Logger 模块，或者在终端安装 pino-pretty，让控制台输出带颜色的结构化 JSON 日志，这样看起来会比原始文本清晰得多。


## 5. 本地运行指南

以下命令默认在项目目录 `my-fullstack-app` 中执行。

### 5.1 环境要求

- Node.js 18 或更高版本
- pnpm 9
- Docker Desktop（用于运行 PostgreSQL 和 Redis）

首次运行先安装依赖：

```powershell
cd C:\code\Align\my-fullstack-app
pnpm install
```

### 5.2 配置环境变量

后端配置文件：`apps/api/.env`

```env
DATABASE_URL="postgresql://dev:dev@localhost:5432/fullstack_app"
JWT_SECRET="请替换为本地开发密钥"
JWT_EXPIRATION_TIME="1h"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

注意：`FRONTEND_URL` 末尾不要添加 `/`，否则浏览器可能因为 CORS Origin 不匹配而拦截 API 响应。

前端配置文件：`apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/"
NEXT_PUBLIC_WS_URL="ws://localhost:4000"
```

修改环境变量后，需要重启对应的开发服务。

### 5.3 启动数据库

先启动 Docker Desktop，再运行：

```powershell
docker compose up -d
docker compose ps
```

正常情况下，PostgreSQL 使用端口 `5432`，Redis 使用端口 `6379`。

首次启动或 Prisma Schema 更新后执行：

```powershell
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

### 5.4 启动应用

同时启动 Web、API 和其他 workspace 开发任务：

```powershell
pnpm dev
```

也可以分别启动：

```powershell
# API：http://localhost:4000
pnpm --filter api start:dev

# Web：http://localhost:3000
pnpm --filter web dev
```

常用访问地址：

- Web 首页：`http://localhost:3000`
- 登录/注册：`http://localhost:3000/login`
- Workspace：`http://localhost:3000/workspaces`
- API 健康检查：`http://localhost:4000`

### 5.5 首次使用流程

1. 打开 `http://localhost:3000/login`。
2. 切换到 Register，创建第一个账户。
3. 登录成功后，前端会把 JWT 保存到 `localStorage.accessToken`。
4. 创建 Workspace。
5. 如需邀请成员，请先让对方注册账户，然后在 Members & Access 中输入对方邮箱并选择角色。

Owner 可以邀请 Admin 或 Member；Admin 只能邀请 Member。当前邀请功能会直接把已注册用户加入 Workspace，不发送真实邮件。

### 5.6 验证与检查

```powershell
pnpm check-types
pnpm lint
pnpm build
```

提交代码前至少运行 `pnpm check-types` 和 `pnpm lint`。

### 5.7 常见问题

#### Unable to connect to the API service

- 确认 API 正在监听 `4000` 端口。
- 确认 `NEXT_PUBLIC_API_URL` 指向 `http://localhost:4000/`。
- 确认 `FRONTEND_URL` 是 `http://localhost:3000`，末尾没有 `/`。

#### Unauthorized / 401

- 打开 `/login` 重新登录。
- 401 时前端会自动清除失效 token 并跳转登录页。
- JWT 默认一小时过期，可通过 `JWT_EXPIRATION_TIME` 调整。

#### 数据库连接失败

```powershell
docker compose ps
```

确认 Docker Desktop 已启动，并确认 PostgreSQL 容器处于 Running 状态。若 Schema 尚未初始化，重新执行 Prisma migration。

#### 修改共享类型后没有生效

```powershell
pnpm --filter @repo/shared build
```

API 和 Web 使用的是 `@repo/shared` 的构建产物，修改 `packages/shared` 后需要重新构建，或启动 TypeScript watch。


For test:pnpm run test:e2e


For Google and GitHub auth (run from `my-fullstack-app`):

```powershell
pnpm --filter api add passport-google-oauth20 passport-github2
pnpm --filter api add -D @types/passport-google-oauth20 @types/passport-github2
```
