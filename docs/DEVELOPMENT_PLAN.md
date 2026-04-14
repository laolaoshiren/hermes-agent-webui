# Hermes Agent WebUI — 7×24 持续开发计划

> 博士制定 · 2026-04-14
> 目标：让项目以世界顶级开源项目的节奏持续演进

---

## 一、当前项目状态总览

| 维度 | 状态 |
|------|------|
| Open Issues | 20 |
| Open PRs | 5（#38 #39 #44 #45 #36） |
| develop 分支最新 | `7e1f018` — cron i18n 已合入 |
| main 分支最新 | `b1a0c52` — brand rename wave |
| 测试通过率 | 57/76（75%），19 个因改名失败 |
| MVP 后端完整性 | 已补全，20+ 端点可用 |

---

## 二、Phase 0 — 清理战场（第 1-2 天）

### 目标：把积压的 PR 和 bug 全部清掉

#### 2.1 合入待审 PR

| PR | 内容 | 动作 |
|----|------|------|
| #38 | Status 页面本地化 | 合入 develop |
| #39 | Skills 页面本地化 | 合入 develop |
| #44 | Config 页面本地化 | 合入 develop |
| #36 | Brand rename docs | 合入 develop |
| #45 | First-run onboarding | 审查后合入 |

#### 2.2 修复 bug

| Issue | 优先级 | 动作 |
|-------|--------|------|
| #46 | P0 | 修复 workspace 默认路径 /root → os.path.expanduser("~") |
| #47 | P0 | 补全 MVP 后端缺失的 API 端点 |
| #48 | P1 | 修复 19 个失败的单元测试 |

#### 2.3 合并策略

```
develop ← #38 (status i18n)
develop ← #39 (skills i18n)
develop ← #44 (config i18n)
develop ← #36 (brand rename)
develop ← #46 fix (workspace path)
develop ← #47 fix (mvp backend endpoints)
develop ← #48 fix (stale test fixtures)
develop ← #45 (onboarding, 审查后)
```

---

## 三、Phase 1 — 产品体验打磨（第 3-7 天）

### 目标：让 WebUI 真正能日常使用

#### 3.1 核心功能补全

| Issue | 内容 | 预计工时 |
|-------|------|----------|
| #2 | API 契约定义 sessions/runs/events | 1天 |
| #3 | i18n 基线：shell chrome 本地化 | 已大部分完成，收尾 |
| #4 | Approvals inbox + run state model | 2天 |

#### 3.2 体验优化

| Issue | 内容 |
|-------|------|
| #40 | First-run UX：chat-first 体验 |
| #41 | Composer UX：workspace/context 优先 |
| #42 | Responsive UX：窄屏适配 |
| #43 | 安全删除：confirm/undo |

#### 3.3 剩余页面本地化收尾

- [x] CronPage ✅
- [x] StatusPage ✅
- [x] SkillsPage ✅
- [x] ConfigPage ✅
- [x] EnvPage ✅
- [ ] AnalyticsPage
- [ ] LogsPage
- [ ] WorkspacesPage
- [ ] RunsPage
- [ ] ApprovalsPage
- [ ] OverviewPage

---

## 四、Phase 2 — 后端生产化（第 8-14 天）

### 目标：从 MVP adapter 过渡到真实后端

#### 4.1 后端架构升级

- [ ] 真实的 config CRUD（读写 ~/.hermes/config.yaml）
- [ ] 真实的 env CRUD（读写 ~/.hermes/.env）
- [ ] 真实的 cron 管理（hermes cron CLI 集成）
- [ ] 真实的 skills 管理（hermes skills CLI 集成）
- [ ] 真实的 logs 查询（tail + filter）
- [ ] 真实的 analytics 数据（从 state.db 聚合）

#### 4.2 流式聊天

| Issue | 内容 |
|-------|------|
| #32 | Streaming chat transport + in-flight UX |

#### 4.3 认证与安全

- [ ] Session token 认证
- [ ] CORS 白名单
- [ ] 敏感数据脱敏

---

## 五、Phase 3 — 开源运营（持续进行）

### 目标：GitHub stars、社区、品牌

| Issue | 内容 |
|-------|------|
| #33 | README polish, releases, badges, bilingual docs |
| #34 | Brand/SEO rename |

#### 持续任务

- [ ] 每周 changelog / release note
- [ ] Issue 自动分类和响应
- [ ] PR review 反馈
- [ ] README 持续更新
- [ ] 贡献者友好文档

---

## 六、Phase 4 — 高级功能（第 15-30 天）

### 目标：产品差异化

- [ ] 多模型支持（切换 provider/model）
- [ ] Session 录制回放
- [ ] Workspace 协作（多人共享状态）
- [ ] 实时通知（WebSocket / SSE）
- [ ] 移动端 PWA 支持
- [ ] 插件系统（自定义 toolsets）
- [ ] 部署方案（Docker + Kubernetes）

---

## 七、自动化调度（7×24 执行）

### 每日任务

| 时间 | 任务 | Cron |
|------|------|------|
| 08:00 | 检查 open issues，修复高优先级 bug | `0 8 * * *` |
| 12:00 | 合入已审查的 PR | `0 12 * * *` |
| 16:00 | 推进当前 phase 的下一个功能 | `0 16 * * *` |
| 20:00 | 代码质量检查：lint + typecheck + test | `0 20 * * *` |
| 00:00 | 写 changelog，更新 devlog | `0 0 * * *` |

### 每周任务

| 时间 | 任务 | Cron |
|------|------|------|
| 周一 09:00 | Phase 回顾：检查进度，调整计划 | `0 9 * * 1` |
| 周三 14:00 | Release 准备：打 tag，生成 release note | `0 14 * * 3` |
| 周五 10:00 | 架构审查：检查代码健康度和测试覆盖 | `0 10 * * 5` |

---

## 八、质量门禁

每个 PR 必须通过：

```
✅ npm run lint
✅ npm run typecheck
✅ npm run build
✅ npm run test -- --run
✅ docs/DEVLOG.md 已更新（如适用）
✅ Issue 已关联
✅ 中英文双语文案一致
```

---

## 九、分支策略

```
main          ← 稳定版本，仅从 develop 合入
develop       ← 活跃迭代，所有 PR 目标分支
feat/*        ← 功能开发
fix/*         ← Bug 修复
chore/*       ← 文档/维护
hotfix/*      ← 生产紧急修复 → main
```

---

## 十、里程碑

| 里程碑 | 目标日期 | 交付物 |
|--------|----------|--------|
| v0.2.0 | Phase 0 完成 | 全部 bug 修复，PR 合入，测试全绿 |
| v0.3.0 | Phase 1 完成 | 产品可用，体验打磨完成 |
| v0.4.0 | Phase 2 完成 | 后端生产化，streaming chat |
| v1.0.0 | Phase 4 完成 | 正式发布 |

---

> 博士将以此计划为蓝图，7×24 不间断推进。
> 每次交付都会在 Telegram 通知老哥进度。🚀
