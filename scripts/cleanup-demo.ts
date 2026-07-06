import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const demoTargets = [
  "src/components/todo-list",
  "src/components/notifications",
  "src/app/api/todos",
  "src/lib/api/todos.ts",
  "src/lib/db/schema/todos.ts",
  "src/lib/db/queries/todos.ts",
  "src/lib/db/migrations",
  "src/lib/mcp/tools",
];

const exportCleanupFiles = [
  "src/lib/api/index.ts",
  "src/lib/db/queries/index.ts",
  "src/lib/db/schema/index.ts",
];

const CLEAN_MCP_SERVER = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function buildMcpServer(userId: string): McpServer {
  void userId;

  const server = new McpServer({
    name: "eazo-mcp",
    version: "1.0.0",
  });

  // Register your tools here after adding files under src/lib/mcp/tools/.
  //   import { registerMyTool } from "./tools/my-tool";
  //   registerMyTool(server, userId);

  return server;
}
`;

const CLEAN_HOME_PAGE = `import { HomePage } from "@/components/home";

export default function Home() {
  return <HomePage />;
}
`;

const CLEAN_HOME_INDEX = `export { HomePage } from "./home-page";
`;

const CLEAN_HOME_PAGE_COMPONENT = `"use client";

import { useTranslation } from "react-i18next";
import { UserBadge } from "@/components/user-profile/user-badge";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const STEP_KEYS = [
  "readDocs",
  "replacePage",
  "firstFeature",
  "translations",
] as const;

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.orange.500/0.18),transparent_50%)]"
      />

      <header className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <UserBadge />
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-20 md:px-10">
        <section className="space-y-4 text-center md:text-left">
          <span className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-300">
            {t("starter.badge")}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            {t("starter.title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("starter.subtitle")}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEP_KEYS.map((key) => (
            <article
              key={key}
              className="rounded-2xl border bg-card/60 p-5 shadow-sm backdrop-blur"
            >
              <h2 className="text-base font-medium">
                {t(\`starter.steps.\${key}.title\`)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t(\`starter.steps.\${key}.desc\`)}
              </p>
              <code className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {t(\`starter.steps.\${key}.code\`)}
              </code>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border bg-card/50 p-5 md:p-6">
          <h3 className="text-sm font-medium">{t("starter.nextCommand.title")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("starter.nextCommand.desc")}
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-sm">
            <code>{t("starter.nextCommand.command")}</code>
          </pre>
        </section>
      </main>
    </div>
  );
}
`;

const CLEAN_NOTIFICATIONS_TEST_ROUTE = `import { type NextRequest, NextResponse } from "next/server";
import { notifications, EazoNotificationPublishError } from "@eazo/sdk/server";
import { requireAuth } from "@/lib/auth";

/**
 * Sends a test push to every subscriber of this app. The template ships a
 * static message so the route works immediately after \`bun run cleanup:demo\`.
 * Customize \`title\` / \`body\` / \`data\` for your product.
 */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const callerLabel =
    auth.user.name?.trim() || auth.user.email?.split("@")[0] || "there";

  try {
    const result = await notifications.publish({
      title: \`Hello, \${callerLabel} 👋\`,
      body: "This is a test notification from your Eazo app.",
      data: {
        source: "test-button",
        triggeredByUserId: auth.user.id,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof EazoNotificationPublishError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code >= 400 && err.code < 600 ? err.code : 500 },
      );
    }
    console.error("[notifications/test] unexpected error", err);
    return NextResponse.json({ error: "publish failed" }, { status: 500 });
  }
}
`;

const CLEAN_LOCALE_EN = {
  common: {
    signIn: "Sign in",
    signOut: "Sign out",
    loading: "Loading…",
    on: "On",
    off: "Off",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    userId: "User ID",
  },
  language: {
    label: "Language",
    triggerLabel: "Language: {{language}}",
    followSystem: "System",
    followSystemWithLanguage: "System ({{language}})",
    enUS: "English",
    zhCN: "中文",
  },
  errors: {
    notFound: {
      code: "404",
      title: "Page not found",
      description:
        "The page you're looking for doesn't exist or may have been moved.",
      backHome: "Back to home",
    },
    generic: {
      title: "Something went wrong",
      description:
        "An unexpected error occurred. You can try again or return to the home page.",
      tryAgain: "Try again",
      backHome: "Back to home",
    },
  },
  starter: {
    badge: "Eazo App Starter",
    title: "Build your next app with Eazo",
    subtitle:
      "Demo artifacts are removed. You now have a clean foundation with auth, data access, and platform integrations ready for your product.",
    steps: {
      readDocs: {
        title: "Read the docs",
        desc: "Open AGENTS.md and README.md to understand the template architecture.",
        code: "AGENTS.md + README.md",
      },
      replacePage: {
        title: "Replace this page",
        desc: "Move your product UI into src/components and keep page.tsx thin.",
        code: "src/app/page.tsx",
      },
      firstFeature: {
        title: "Build your first feature",
        desc: "Add API routes under src/app/api and call them from typed helpers.",
        code: "src/app/api/*",
      },
      translations: {
        title: "Add translations",
        desc: "Edit en-US / zh-CN strings in src/i18n/locales. LanguageSwitcher and I18nProvider in layout.tsx are already wired.",
        code: "src/i18n/locales/",
      },
    },
    nextCommand: {
      title: "Next command",
      desc: "Start developing and iterate in real time.",
      command: "bun dev",
    },
  },
} as const;

const CLEAN_LOCALE_ZH = {
  common: {
    signIn: "登录",
    signOut: "退出登录",
    loading: "加载中…",
    on: "开",
    off: "关",
    close: "关闭",
    save: "保存",
    cancel: "取消",
    edit: "编辑",
    delete: "删除",
    userId: "用户 ID",
  },
  language: {
    label: "语言",
    triggerLabel: "语言：{{language}}",
    followSystem: "跟随系统",
    followSystemWithLanguage: "跟随系统（{{language}}）",
    enUS: "English",
    zhCN: "中文",
  },
  errors: {
    notFound: {
      code: "404",
      title: "页面未找到",
      description: "你访问的页面不存在，或已被移动。",
      backHome: "返回首页",
    },
    generic: {
      title: "出了点问题",
      description: "发生了意外错误。你可以重试，或返回首页继续。",
      tryAgain: "重试",
      backHome: "返回首页",
    },
  },
  starter: {
    badge: "Eazo 应用模板",
    title: "用 Eazo 构建你的下一个应用",
    subtitle:
      "演示代码已移除。你现在拥有干净的基础：认证、数据访问与平台能力已就绪，可直接开发产品功能。",
    steps: {
      readDocs: {
        title: "阅读文档",
        desc: "打开 AGENTS.md 与 README.md，了解模板架构与约定。",
        code: "AGENTS.md + README.md",
      },
      replacePage: {
        title: "替换本页",
        desc: "将产品 UI 放到 src/components 下，并保持 page.tsx 为薄入口。",
        code: "src/app/page.tsx",
      },
      firstFeature: {
        title: "开发第一个功能",
        desc: "在 src/app/api 添加接口，并通过 src/lib/api 中的类型化 helper 调用。",
        code: "src/app/api/*",
      },
      translations: {
        title: "补充翻译",
        desc: "在 src/i18n/locales 编辑中英文文案；layout 已接入 LanguageSwitcher 与 I18nProvider。",
        code: "src/i18n/locales/",
      },
    },
    nextCommand: {
      title: "下一步命令",
      desc: "启动开发服务器，实时迭代你的产品。",
      command: "bun dev",
    },
  },
} as const;

const fileRewrites: Array<{
  relPath: string;
  contents: string;
  createIfMissing?: boolean;
}> = [
  { relPath: "src/lib/mcp/server.ts", contents: CLEAN_MCP_SERVER },
  { relPath: "src/app/page.tsx", contents: CLEAN_HOME_PAGE },
  {
    relPath: "src/components/home/home-page.tsx",
    contents: CLEAN_HOME_PAGE_COMPONENT,
    createIfMissing: true,
  },
  {
    relPath: "src/components/home/index.tsx",
    contents: CLEAN_HOME_INDEX,
    createIfMissing: true,
  },
  {
    relPath: "src/app/api/notifications/test/route.ts",
    contents: CLEAN_NOTIFICATIONS_TEST_ROUTE,
  },
  {
    relPath: "src/i18n/locales/en-US.json",
    contents: `${JSON.stringify(CLEAN_LOCALE_EN, null, 2)}\n`,
  },
  {
    relPath: "src/i18n/locales/zh-CN.json",
    contents: `${JSON.stringify(CLEAN_LOCALE_ZH, null, 2)}\n`,
  },
];


function resolveFromRoot(relPath: string): string {
  return path.join(ROOT, relPath);
}

function removePath(relPath: string) {
  const absPath = resolveFromRoot(relPath);
  if (!existsSync(absPath)) {
    console.log(`- skip (not found): ${relPath}`);
    return;
  }

  rmSync(absPath, { recursive: true, force: true });
  console.log(`- removed: ${relPath}`);
}

function cleanupTodosExport(relPath: string) {
  const absPath = resolveFromRoot(relPath);
  if (!existsSync(absPath)) {
    console.log(`- skip export cleanup (not found): ${relPath}`);
    return;
  }

  const original = readFileSync(absPath, "utf8");
  const next = original
    .split("\n")
    .filter((line) => !/^\s*export\s+\*\s+from\s+["']\.\/todos["'];?\s*$/.test(line))
    .join("\n")
    .trimEnd();

  const finalContent = next.length > 0 ? `${next}\n` : "";
  if (finalContent !== original) {
    writeFileSync(absPath, finalContent, "utf8");
    console.log(`- cleaned exports: ${relPath}`);
  } else {
    console.log(`- no export changes: ${relPath}`);
  }
}

function rewriteFile({
  relPath,
  contents,
  createIfMissing = false,
}: {
  relPath: string;
  contents: string;
  createIfMissing?: boolean;
}) {
  const absPath = resolveFromRoot(relPath);
  if (!existsSync(absPath)) {
    if (!createIfMissing) {
      console.log(`- skip rewrite (not found): ${relPath}`);
      return;
    }
    mkdirSync(path.dirname(absPath), { recursive: true });
    writeFileSync(absPath, contents, "utf8");
    console.log(`- created: ${relPath}`);
    return;
  }

  const original = readFileSync(absPath, "utf8");
  if (original === contents) {
    console.log(`- already clean: ${relPath}`);
    return;
  }

  writeFileSync(absPath, contents, "utf8");
  console.log(`- rewrote: ${relPath}`);
}

function main() {
  console.log("Cleaning template demo artifacts...");
  demoTargets.forEach(removePath);

  console.log("Fixing stale index exports...");
  exportCleanupFiles.forEach(cleanupTodosExport);

  console.log("Rewriting files that referenced demo modules...");
  fileRewrites.forEach(rewriteFile);

  console.log("Done. Demo cleanup completed.");
}

main();
