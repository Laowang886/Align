# Align

[中文](#中文) | [English](#english)

## 中文

面向团队协作的一体化项目管理平台。Align 将工作空间、项目规划、看板、迭代、知识库和团队沟通集中在一个应用中，帮助团队围绕同一目标保持同步。

### 功能概览

- 工作空间与成员权限管理（Owner、Admin、Member）
- 项目创建与团队仪表盘
- Kanban 看板与任务管理
- Sprint 规划与进度跟踪
- Wiki 文档与 Markdown 内容
- 工作空间聊天、附件与频道公告
- 站内通知与通知偏好设置
- 邮箱密码、Google 和 GitHub 登录
- 用户反馈与安全举报

### 技术栈

| 层级 | 技术 |
| --- | --- |
| Web | Next.js 16、React 19、TanStack Query |
| API | NestJS 11、Passport、JWT |
| 数据 | PostgreSQL 16、Prisma 7、Redis 7 |
| 工程化 | TypeScript、pnpm Workspace、Turborepo、ESLint、Prettier、Jest |

### 快速开始

#### 1. 环境要求

- Node.js 18+
- pnpm 9（项目锁定版本为 `9.15.9`）
- Docker Desktop 或兼容的 Docker 环境

#### 2. 安装依赖

所有项目命令均在 `my-fullstack-app` 目录中执行：

```powershell
cd my-fullstack-app
pnpm install
```

#### 3. 配置环境变量

创建 `apps/api/.env`：

```env
DATABASE_URL="postgresql://dev:dev@localhost:5432/fullstack_app"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="replace-with-a-local-secret"
JWT_EXPIRATION_TIME="1h"
FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:4000"
PORT=4000

# 当前 API 启动时会加载 OAuth Strategy，因此本地也需要提供这些配置。
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:4000/auth/github/callback"
```

创建 `apps/web/.env.local`：

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

`FRONTEND_URL` 末尾不要添加 `/`，否则浏览器可能因 CORS Origin 不匹配而拦截请求。

#### 4. 启动基础服务并初始化数据库

```powershell
docker compose up -d
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

#### 5. 启动应用

```powershell
pnpm dev
```

启动后可访问：

- Web：<http://localhost:3000>
- 登录与注册：<http://localhost:3000/login>
- API：<http://localhost:4000>
- PostgreSQL：`localhost:5432`
- Redis：`localhost:6379`

也可以分别启动前后端：

```powershell
pnpm --filter web dev
pnpm --filter api start:dev
```

### 项目结构

```text
Align/
├── README.md
├── DEVELOPMENT.md
└── my-fullstack-app/
    ├── apps/
    │   ├── web/              # Next.js 前端
    │   ├── api/              # NestJS API 与 Prisma Schema
    │   └── docs/             # 文档站点
    ├── packages/
    │   ├── shared/           # 前后端共享类型
    │   ├── ui/               # 共享 UI 组件
    │   ├── eslint-config/    # 共享 ESLint 配置
    │   └── typescript-config/ # 共享 TypeScript 配置
    ├── docker-compose.yml
    ├── package.json
    └── turbo.json
```

### 常用命令

以下命令均在 `my-fullstack-app` 目录中执行。

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动所有应用的开发模式 |
| `pnpm build` | 构建所有应用与包 |
| `pnpm check-types` | 执行 TypeScript 类型检查 |
| `pnpm lint` | 执行 ESLint 检查 |
| `pnpm --filter web test` | 运行前端测试 |
| `pnpm --filter api test` | 运行 API 单元测试 |
| `pnpm --filter api test:e2e` | 运行 API 端到端测试 |
| `pnpm --filter @repo/shared build` | 重新构建共享类型 |

修改 `packages/shared` 中的类型后，请重新构建该包；持续开发时可运行：

```powershell
pnpm --filter @repo/shared exec tsc --watch
```

### 开发文档

更详细的数据库迁移、开发工作流和常见问题请参阅 [DEVELOPMENT.md](./DEVELOPMENT.md)。

### 项目状态

Align 目前处于开发阶段，接口和数据结构仍可能调整。

---

## English

An all-in-one project management platform for team collaboration. Align brings workspaces, project planning, Kanban boards, sprints, documentation, and team communication into one application, helping teams stay aligned around shared goals.

### Features

- Workspace and member permission management (Owner, Admin, and Member)
- Project creation and team dashboards
- Kanban boards and task management
- Sprint planning and progress tracking
- Wiki documents with Markdown support
- Workspace chat, attachments, and channel announcements
- In-app notifications and notification preferences
- Email/password, Google, and GitHub authentication
- User feedback and safety reporting

### Tech Stack

| Layer | Technologies |
| --- | --- |
| Web | Next.js 16, React 19, TanStack Query |
| API | NestJS 11, Passport, JWT |
| Data | PostgreSQL 16, Prisma 7, Redis 7 |
| Tooling | TypeScript, pnpm Workspace, Turborepo, ESLint, Prettier, Jest |

### Quick Start

#### 1. Prerequisites

- Node.js 18+
- pnpm 9 (the project is pinned to `9.15.9`)
- Docker Desktop or another compatible Docker environment

#### 2. Install Dependencies

Run all project commands from the `my-fullstack-app` directory:

```powershell
cd my-fullstack-app
pnpm install
```

#### 3. Configure Environment Variables

Create `apps/api/.env`:

```env
DATABASE_URL="postgresql://dev:dev@localhost:5432/fullstack_app"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="replace-with-a-local-secret"
JWT_EXPIRATION_TIME="1h"
FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:4000"
PORT=4000

# The API currently loads its OAuth strategies at startup, so these values
# must also be present in the local environment.
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:4000/auth/github/callback"
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

Do not add a trailing `/` to `FRONTEND_URL`; otherwise, the browser may reject API responses because the CORS origin does not match.

#### 4. Start Infrastructure and Initialize the Database

```powershell
docker compose up -d
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

#### 5. Start the Application

```powershell
pnpm dev
```

Once the application is running, open:

- Web: <http://localhost:3000>
- Login and registration: <http://localhost:3000/login>
- API: <http://localhost:4000>
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

You can also start the frontend and backend separately:

```powershell
pnpm --filter web dev
pnpm --filter api start:dev
```

### Project Structure

```text
Align/
├── README.md
├── DEVELOPMENT.md
└── my-fullstack-app/
    ├── apps/
    │   ├── web/               # Next.js frontend
    │   ├── api/               # NestJS API and Prisma schema
    │   └── docs/              # Documentation site
    ├── packages/
    │   ├── shared/            # Types shared by the frontend and backend
    │   ├── ui/                # Shared UI components
    │   ├── eslint-config/     # Shared ESLint configuration
    │   └── typescript-config/ # Shared TypeScript configuration
    ├── docker-compose.yml
    ├── package.json
    └── turbo.json
```

### Common Commands

Run the following commands from the `my-fullstack-app` directory.

| Command | Description |
| --- | --- |
| `pnpm dev` | Start all applications in development mode |
| `pnpm build` | Build all applications and packages |
| `pnpm check-types` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm --filter web test` | Run frontend tests |
| `pnpm --filter api test` | Run API unit tests |
| `pnpm --filter api test:e2e` | Run API end-to-end tests |
| `pnpm --filter @repo/shared build` | Rebuild the shared types package |

After changing types in `packages/shared`, rebuild the package. During active development, you can run:

```powershell
pnpm --filter @repo/shared exec tsc --watch
```

### Development Guide

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed database migration instructions, development workflows, and troubleshooting guidance.

### Project Status

Align is currently under active development. APIs and data structures may change.
