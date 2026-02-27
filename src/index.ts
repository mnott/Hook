#!/usr/bin/env node
/**
 * Hookmark MCP server — entry point and tool registrations.
 *
 * This server exposes the Hookmark `hook` CLI (v2.1.3) as MCP tools so that
 * Claude Code and other MCP clients can generate, query, and manage Hookmark
 * links programmatically.
 *
 * ### Tools registered
 * | Tool name              | CLI command   | Purpose                                              |
 * |------------------------|---------------|------------------------------------------------------|
 * | `hookmark_link`        | `hook clip`   | Generate a hook:// URL for a file or URL             |
 * | `hookmark_connect`     | `hook link`   | Create a bidirectional hook between two items        |
 * | `hookmark_list`        | `hook list`   | List all hooks attached to a file or URL             |
 * | `hookmark_search`      | `hook find`   | Search Hookmark bookmarks by keyword                 |
 * | `hookmark_remove`      | `hook remove` | Remove a hook between two items                      |
 * | `hookmark_clone`       | `hook clone`  | Clone all hooks from one item to another             |
 * | `hookmark_frontmost`   | `hook from`   | Get the hook:// URL for the frontmost app window     |
 *
 * ### Configuration
 * Set the `HOOK_CLI` environment variable to override the default CLI path:
 *   HOOK_CLI=/usr/local/bin/hook node dist/index.js
 *
 * Default CLI path: /opt/homebrew/lib/ruby/gems/4.0.0/bin/hook
 *
 * ### stdout constraint
 * In MCP server mode stdout is the JSON-RPC transport. Never write anything
 * other than well-formed MCP JSON to stdout. All debug output and log lines
 * must go to stderr.
 */

import { execSync } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// CLI path resolution
// ---------------------------------------------------------------------------

const HOOK_CLI =
  process.env.HOOK_CLI ?? "/opt/homebrew/lib/ruby/gems/4.0.0/bin/hook";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResponse(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

/**
 * Execute a hook CLI command and return trimmed stdout.
 * Throws if the process exits with a non-zero code.
 */
function runHook(args: string[]): string {
  const cmd = [HOOK_CLI, ...args].map((a) => shellEscape(a)).join(" ");
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
    return output.trim();
  } catch (err: unknown) {
    if (err && typeof err === "object" && "stderr" in err) {
      const e = err as { stderr: string; stdout: string; message: string };
      const detail = (e.stderr || e.message || "").trim();
      throw new Error(detail || `hook ${args[0]} failed`);
    }
    throw err;
  }
}

/** Minimal shell escaping — wraps in single quotes, escapes embedded single quotes. */
function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

// ---------------------------------------------------------------------------
// Server definition
// ---------------------------------------------------------------------------

const server = new McpServer(
  {
    name: "hookmark-mcp",
    version: "0.1.0",
  },
  {
    instructions: [
      "## Hookmark MCP — Hookmark Link Management for Claude Code",
      "",
      "This server exposes the Hookmark productivity app via its `hook` CLI.",
      "Hookmark creates bidirectional links (hooks) between files, URLs, emails,",
      "tasks, notes, and other items on macOS using `hook://` URLs.",
      "",
      "### Common Workflows",
      "",
      "**Link two documents together:**",
      "1. Get the hook URL for each item using `hookmark_link` (for files/URLs)",
      "   or `hookmark_frontmost` (for the active app window).",
      "2. Call `hookmark_connect` with both hook:// URLs to create the bidirectional link.",
      "",
      "**Find what's linked to a file:**",
      "Call `hookmark_list` with the file path or hook:// URL.",
      "",
      "**Search for bookmarks:**",
      "Call `hookmark_search` with a keyword.",
      "",
      "### Item References",
      "Items can be referenced by:",
      "- Absolute file path: `/Users/you/Documents/note.md`",
      "- `hook://` URL: `hook://file/...`",
      "- Any URL: `https://example.com/page`",
    ].join("\n"),
  },
);

// ---------------------------------------------------------------------------
// Tool: hookmark_link
// ---------------------------------------------------------------------------

server.registerTool("hookmark_link", {
  description: [
    "Generate a hook:// URL for a file or web URL and copy it to the clipboard.",
    "Returns the hook:// URL that Hookmark assigned to the item.",
    "Use this URL as a stable reference to the item when calling hookmark_connect.",
    "Accepts an absolute file path (e.g. '/Users/you/note.md') or any URL (e.g. 'https://example.com').",
  ].join(" "),
  inputSchema: {
    item: z
      .string()
      .min(1)
      .describe("Absolute file path or URL to get a Hookmark URL for"),
  },
}, async ({ item }) => {
  try {
    // `hook clip` copies to clipboard and prints the URL on stdout
    const output = runHook(["clip", item]);
    // The CLI prints something like:
    //   Copied Hook URL for 'filename' to clipboard
    // or returns the URL directly. Try to extract a hook:// URL if present.
    const hookUrl = extractHookUrl(output);
    if (hookUrl) {
      return { content: [{ type: "text", text: hookUrl }] };
    }
    // Fallback: return whatever the CLI printed
    return {
      content: [
        {
          type: "text",
          text: output || `Hookmark URL for '${item}' copied to clipboard. Paste to retrieve the URL.`,
        },
      ],
    };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Tool: hookmark_connect
// ---------------------------------------------------------------------------

server.registerTool("hookmark_connect", {
  description: [
    "Create a bidirectional hook (link) between two items.",
    "Both items must be referenced by their file path, URL, or hook:// URL.",
    "After this call, each item will appear in the other's hook list.",
    "Use hookmark_link or hookmark_frontmost to obtain hook:// URLs first.",
  ].join(" "),
  inputSchema: {
    item_a: z
      .string()
      .min(1)
      .describe("First item: absolute file path, URL, or hook:// URL"),
    item_b: z
      .string()
      .min(1)
      .describe("Second item: absolute file path, URL, or hook:// URL"),
  },
}, async ({ item_a, item_b }) => {
  try {
    const output = runHook(["link", item_a, item_b]);
    return {
      content: [
        {
          type: "text",
          text: output || `Hook created between '${item_a}' and '${item_b}'.`,
        },
      ],
    };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Tool: hookmark_list
// ---------------------------------------------------------------------------

server.registerTool("hookmark_list", {
  description: [
    "List all items hooked to a given file or URL.",
    "Returns one item per line in the requested format.",
    "Use format 'paths' (default) for plain paths/URLs, 'markdown' for clickable links,",
    "'hooks' for hook:// URLs only, or 'verbose' for full details.",
    "Accepts an absolute file path, URL, or hook:// URL.",
    "Call with no item to list all Hookmark bookmarks.",
  ].join(" "),
  inputSchema: {
    item: z
      .string()
      .optional()
      .describe("Absolute file path, URL, or hook:// URL to list hooks for. Omit to list all bookmarks."),
    format: z
      .enum(["paths", "hooks", "markdown", "verbose"])
      .default("paths")
      .describe("Output format: 'paths' (default), 'hooks' (hook:// URLs), 'markdown' (links), or 'verbose' (full details)"),
    files_only: z
      .boolean()
      .default(false)
      .describe("When true, exclude non-file items such as emails"),
  },
}, async ({ item, format, files_only }) => {
  try {
    const args: string[] = ["list", "-o", format];
    if (files_only) args.push("--files_only");
    if (item) args.push(item);

    const output = runHook(args);
    if (!output) {
      return {
        content: [
          {
            type: "text",
            text: item ? `No hooks found for '${item}'.` : "No Hookmark bookmarks found.",
          },
        ],
      };
    }
    return { content: [{ type: "text", text: output }] };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Tool: hookmark_search
// ---------------------------------------------------------------------------

server.registerTool("hookmark_search", {
  description: [
    "Search Hookmark bookmarks by keyword.",
    "Searches both bookmark names and URLs by default.",
    "Returns matching items, one per line.",
    "Use format 'paths' (default), 'markdown', 'hooks', or 'verbose' to control output.",
    "Use names_only to restrict the search to bookmark names only.",
  ].join(" "),
  inputSchema: {
    query: z
      .string()
      .min(1)
      .describe("Search term to look for in bookmark names and URLs"),
    format: z
      .enum(["paths", "hooks", "markdown", "verbose"])
      .default("markdown")
      .describe("Output format: 'paths', 'hooks', 'markdown' (default), or 'verbose'"),
    names_only: z
      .boolean()
      .default(false)
      .describe("When true, search only bookmark names, not URLs"),
    files_only: z
      .boolean()
      .default(false)
      .describe("When true, exclude non-file items such as emails"),
  },
}, async ({ query, format, names_only, files_only }) => {
  try {
    const args: string[] = ["find", "-o", format];
    if (names_only) args.push("--names_only");
    if (files_only) args.push("--files_only");
    args.push(query);

    const output = runHook(args);
    if (!output) {
      return {
        content: [{ type: "text", text: `No bookmarks found matching '${query}'.` }],
      };
    }
    return { content: [{ type: "text", text: output }] };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Tool: hookmark_remove
// ---------------------------------------------------------------------------

server.registerTool("hookmark_remove", {
  description: [
    "Remove a bidirectional hook between two items.",
    "Both items must be referenced by their file path, URL, or hook:// URL.",
    "This removes the link from both directions — after this call neither item",
    "will appear in the other's hook list.",
  ].join(" "),
  inputSchema: {
    item_a: z
      .string()
      .min(1)
      .describe("First item: absolute file path, URL, or hook:// URL"),
    item_b: z
      .string()
      .min(1)
      .describe("Second item: absolute file path, URL, or hook:// URL"),
  },
}, async ({ item_a, item_b }) => {
  try {
    const output = runHook(["remove", item_a, item_b]);
    return {
      content: [
        {
          type: "text",
          text: output || `Hook removed between '${item_a}' and '${item_b}'.`,
        },
      ],
    };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Tool: hookmark_clone
// ---------------------------------------------------------------------------

server.registerTool("hookmark_clone", {
  description: [
    "Clone all hooks from one item onto another.",
    "Every item hooked to the source will also become hooked to the destination.",
    "The source item's hooks are not modified — this is a copy operation.",
    "Useful when duplicating a file or moving content to a new location.",
  ].join(" "),
  inputSchema: {
    source: z
      .string()
      .min(1)
      .describe("Source item: absolute file path, URL, or hook:// URL to clone hooks from"),
    destination: z
      .string()
      .min(1)
      .describe("Destination item: absolute file path, URL, or hook:// URL to clone hooks onto"),
  },
}, async ({ source, destination }) => {
  try {
    const output = runHook(["clone", source, destination]);
    return {
      content: [
        {
          type: "text",
          text: output || `Cloned hooks from '${source}' to '${destination}'.`,
        },
      ],
    };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Tool: hookmark_frontmost
// ---------------------------------------------------------------------------

server.registerTool("hookmark_frontmost", {
  description: [
    "Get the hook:// URL for the active document or window in the frontmost macOS application.",
    "Brings the specified application to the foreground and creates a Hookmark bookmark",
    "for whatever is currently active in that app (document, email, note, task, etc.).",
    "Returns the hook:// URL that can be used with hookmark_connect to link it to other items.",
    "Specify the app name without the '.app' suffix, e.g. 'Finder', 'Mail', 'Obsidian', 'Bear'.",
  ].join(" "),
  inputSchema: {
    app: z
      .string()
      .min(1)
      .describe("Application name without '.app' suffix (e.g. 'Finder', 'Mail', 'Obsidian', 'Bear', 'Xcode')"),
    markdown: z
      .boolean()
      .default(false)
      .describe("When true, return the result as a Markdown link instead of a bare hook:// URL"),
  },
}, async ({ app, markdown }) => {
  try {
    const args: string[] = ["from"];
    if (markdown) args.push("--markdown");
    args.push(app);

    const output = runHook(args);
    if (!output) {
      return {
        content: [
          {
            type: "text",
            text: `Could not get a Hookmark URL from '${app}'. Make sure the app is running and has an active document.`,
          },
        ],
      };
    }
    return { content: [{ type: "text", text: output }] };
  } catch (err) {
    return errorResponse(err);
  }
});

// ---------------------------------------------------------------------------
// Utility: extract hook:// URL from CLI output
// ---------------------------------------------------------------------------

function extractHookUrl(text: string): string | null {
  const match = text.match(/hook:\/\/[^\s'"]+/);
  return match ? match[0] : null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`[hookmark-mcp] Fatal error: ${err}\n`);
  process.exit(1);
});
