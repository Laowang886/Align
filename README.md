# Align
#NOTES:
- Every time we update the shared type: "pnpm --filter @repo/shared exec tsc --watch"
    它会持续监听 src 的变化；你每次保存新的 type，dist 会自动更新，不需要重复手动执行 build。
    或者 每次都：“pnpm --filter @repo/shared build”

    原因：因为 apps/api 和前端读取的是 @repo/shared 的 dist/index.d.ts，不是直接读取 src。