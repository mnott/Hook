# hookmark-mcp

MCP server that gives Claude Code (and other MCP clients) full access to [Hookmark](https://hookproductivity.com) — the macOS app that creates bidirectional links between files, URLs, emails, notes, and anything else with an address.

Link a PDF to an email. Connect a note to a webpage. Find everything related to a project. All through natural language.

## How It Works

```
Claude Code  ──MCP──▶  hookmark-mcp  ──shell──▶  hook CLI  ──▶  Hookmark.app
                        (this server)              (v2.1.3)       (macOS)
```

The server wraps Hookmark's `hook` CLI as seven MCP tools. Claude calls them like any other tool — you just talk normally:

- *"Link my TODO to that PDF on the desktop"*
- *"What's connected to this file?"*
- *"Search hookmark for everything about invoices"*
- *"Hook whatever's open in Mail to this project"*

You never need to remember tool names or parameters.

## Quick Start

**Prerequisites:**
- macOS with [Hookmark](https://hookproductivity.com) installed
- Hookmark's `hook` CLI (`gem install hookmark` or installed with Hookmark)
- Node.js 18+ or Bun

**Install with Claude Code:**

Tell Claude:

> *"Install the hookmark MCP server from github.com/mnott/Hook"*

Claude will clone the repo, build it, and add it to your MCP config.

**Manual install:**

Add to your Claude Code MCP config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "hookmark": {
      "command": "npx",
      "args": ["-y", "hookmark-mcp"]
    }
  }
}
```

Or with Bun:

```json
{
  "mcpServers": {
    "hookmark": {
      "command": "bunx",
      "args": ["hookmark-mcp"]
    }
  }
}
```

Restart Claude Code. The tools are ready.

**From source (development):**

```bash
git clone https://github.com/mnott/Hook.git
cd Hook
bun install
bun run build
```

Then point your MCP config to the local build:

```json
{
  "mcpServers": {
    "hookmark": {
      "command": "node",
      "args": ["/path/to/Hook/dist/index.js"]
    }
  }
}
```

## Tools at a Glance

| Tool | What it does | Example |
|------|-------------|---------|
| `hookmark_link` | Get a `hook://` URL for any file or URL | *"Get me a hook URL for this file"* |
| `hookmark_connect` | Link two items bidirectionally | *"Link this note to that PDF"* |
| `hookmark_list` | Show everything linked to an item | *"What's linked to this file?"* |
| `hookmark_search` | Search all bookmarks by keyword | *"Find all bookmarks about 'project X'"* |
| `hookmark_remove` | Unlink two items | *"Remove the link between these two files"* |
| `hookmark_clone` | Copy all links from one item to another | *"This file replaced that one — copy its links"* |
| `hookmark_frontmost` | Grab a hook URL from whatever's open in an app | *"Get me a hook for whatever's open in Mail"* |

## User Guide

You never need to remember tool names or parameters — just describe what you want in plain English. Here are the things you can do, organized by what you're trying to accomplish.

### Connecting Things

The core of Hookmark is bidirectional links. When you connect two items, each one knows about the other.

> *"Link my TODO.md to the project requirements PDF on the desktop"*

> *"Connect this source file to the GitHub issue at https://github.com/org/repo/issues/42"*

> *"Hook the meeting notes to the presentation slides"*

> *"Link every .ts file in src/ to the architecture document"*

You can link files to files, files to URLs, URLs to URLs — anything with an address.

### Finding Connections

Once things are linked, you can explore the web of connections from any starting point.

> *"What's hooked to this file?"*

> *"Show me everything connected to the project plan"*

> *"List all hooks for src/index.ts in verbose format"*

> *"What files are linked to https://github.com/mnott/Hook?"*

> *"Show me all my Hookmark bookmarks"*

Omit the item to list everything. Ask for different output formats — paths, markdown links, hook:// URLs, or verbose details with titles and addresses.

### Searching

Search across all your Hookmark bookmarks by keyword — it searches both names and URLs.

> *"Search hookmark for 'invoice'"*

> *"Find all bookmarks related to the quarterly report"*

> *"Search hookmark for anything mentioning 'API design'"*

> *"Search just bookmark names for 'meeting' — don't search URLs"*

> *"Search hookmark for 'budget' but only show files, no emails"*

### Working with Apps

Hookmark can reach into the frontmost window of any macOS app and grab a reference to whatever's active — the open document, email, note, task, or webpage.

> *"Get me a hook for whatever's open in Mail"*

> *"Hook the current Obsidian note to this project"*

> *"Link whatever's open in Finder to my TODO"*

> *"Grab a hook URL from Safari and connect it to the design doc"*

Supported apps include Finder, Mail, Safari, Obsidian, Bear, DEVONthink, Xcode, and any app that Hookmark supports (most document-based macOS apps).

### Moving and Reorganizing Files

When you move or rename a file, its hooks don't follow automatically. Clone them to the new location.

> *"I moved report.md to the archive — clone its hooks to the new path"*

> *"Copy all links from the old config to the new config file"*

> *"This file replaced the other one — transfer its hooks"*

The original keeps its links. The destination gets copies of all the same connections.

### Cleaning Up

Remove links you no longer need.

> *"Unlink the budget spreadsheet from the old project plan"*

> *"Remove the hook between these two files"*

> *"Disconnect the meeting notes from the wrong project"*

### Real-World Workflows

**Research and reference management**

> *"Link this paper PDF to the notes I'm writing about it"*
> *"What sources are connected to my literature review?"*
> *"Hook this Stack Overflow answer to the bug fix commit"*

**Project organization**

> *"Connect every file in this project to the project brief"*
> *"What's linked to the project requirements? Show me the full list."*
> *"Link the Jira ticket URL to the implementation file"*

**Email and communication**

> *"Hook whatever's open in Mail to this contract PDF"*
> *"Search hookmark for that email about the deadline"*
> *"Link the client's email to the proposal document"*

**Code and documentation**

> *"Link the API spec to the implementation in src/api/routes.ts"*
> *"What documentation is connected to this module?"*
> *"Hook the test file to the source file it tests"*

**Knowledge management**

> *"Connect this Obsidian note to the original article URL"*
> *"What notes are linked to this topic?"*
> *"Link the DEVONthink document to my project TODO"*

### Combining MCP Servers

Hookmark becomes especially powerful when combined with other MCP servers. Here's a workflow that bridges email, document management, and task tracking across devices.

**Email → DEVONthink → Hookmark → Todoist**

You archive important emails in DEVONthink. DEVONthink items have stable URLs (`x-devonthink-item://...`) that work in DEVONthink To Go on iOS/iPadOS too. By creating a Hookmark link to a DEVONthink document and adding it to a Todoist task, you get a clickable reference from your task list straight to the email — on any device.

> *"Search DEVONthink for the email from the lawyer about the contract"*
> *"Get a hook URL for that DEVONthink document"*
> *"Create a Todoist task 'Review lawyer contract' with that link in the description"*

Or in one shot:

> *"Find the email from Müller about the invoice in DEVONthink, get a hookmark link, and create a Todoist task to follow up on it by Friday"*

This works because:
1. **DEVONthink MCP** finds the archived email
2. **Hookmark MCP** creates a stable `hook://` URL that resolves to the DEVONthink item
3. **Todoist MCP** creates the task with the link in the description
4. On your iPhone, tapping the link in Todoist opens DEVONthink To Go and jumps straight to the email

The same pattern works with any combination — link Obsidian notes to Todoist tasks, connect GitHub issues to DEVONthink research, hook Calendar events to project files.

## MCP Tool Reference

### hookmark_link

Get the stable `hook://` URL for a file or web URL.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `item` | yes | Absolute file path or URL |

### hookmark_connect

Create a bidirectional link between two items.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `item_a` | yes | File path, URL, or `hook://` URL |
| `item_b` | yes | File path, URL, or `hook://` URL |

### hookmark_list

List all items hooked to a given item. Omit `item` to list all bookmarks.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `item` | no | — | File path, URL, or `hook://` URL |
| `format` | no | `paths` | `paths`, `hooks`, `markdown`, or `verbose` |
| `files_only` | no | `false` | Exclude non-file items (emails, etc.) |

### hookmark_search

Search bookmarks by keyword.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `query` | yes | — | Search term |
| `format` | no | `markdown` | `paths`, `hooks`, `markdown`, or `verbose` |
| `names_only` | no | `false` | Search only bookmark names, not URLs |
| `files_only` | no | `false` | Exclude non-file items |

### hookmark_remove

Remove the bidirectional link between two items.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `item_a` | yes | File path, URL, or `hook://` URL |
| `item_b` | yes | File path, URL, or `hook://` URL |

### hookmark_clone

Copy all hooks from source to destination. Source is not modified.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `source` | yes | Item to copy hooks from |
| `destination` | yes | Item to copy hooks onto |

### hookmark_frontmost

Get the `hook://` URL for the active document in a macOS app.

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `app` | yes | — | App name without `.app` (e.g. `Finder`, `Mail`, `Obsidian`) |
| `markdown` | no | `false` | Return as a Markdown link |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOOK_CLI` | `/opt/homebrew/lib/ruby/gems/4.0.0/bin/hook` | Path to the `hook` CLI binary |

Override the CLI path if your `hook` binary is installed elsewhere:

```json
{
  "mcpServers": {
    "hookmark": {
      "command": "npx",
      "args": ["-y", "hookmark-mcp"],
      "env": {
        "HOOK_CLI": "/usr/local/bin/hook"
      }
    }
  }
}
```

## Item References

Hookmark items can be referenced in three ways:

- **Absolute file path:** `/Users/you/Documents/report.pdf`
- **URL:** `https://example.com/page`
- **Hook URL:** `hook://file/5g29VkHoQ?p=...&n=index%2Ets`

Hook URLs are stable identifiers — they survive file renames and moves (as long as Hookmark is tracking the file).

## Troubleshooting

**"hook: command not found"**
The `hook` CLI isn't in the expected path. Install it with `gem install hookmark` or set `HOOK_CLI` to point to your binary. Find it with `which hook` or `gem which hookmark`.

**"Hookmark is not running"**
The `hook` CLI requires Hookmark.app to be running. Open it from Applications.

**Tool calls return empty results**
Hookmark only knows about items it has bookmarked. Open a file in Hookmark first (or use `hookmark_link` to create a bookmark), then hooks can be created.

**"Permission denied" errors**
Claude Code needs accessibility permissions to interact with Hookmark via AppleScript. Check System Settings > Privacy & Security > Accessibility.

## Requirements

- macOS (Hookmark is macOS-only)
- [Hookmark](https://hookproductivity.com) with an active license
- `hook` CLI v2.0+ (`gem install hookmark`)
- Node.js 18+ or Bun

## License

MIT

## Author

Matthias Nott — [github.com/mnott](https://github.com/mnott)
