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