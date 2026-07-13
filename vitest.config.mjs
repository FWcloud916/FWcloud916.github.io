import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // .claude/worktrees 可能保留其他 session 的完整 repo；不得重複執行其測試。
    exclude: [...configDefaults.exclude, "**/.claude/worktrees/**"],
  },
});
