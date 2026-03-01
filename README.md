# MCP Browser Examples

Practical code examples for AI browser automation using [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

## What is MCP?

MCP (Model Context Protocol) is an open standard that lets AI assistants (Claude, GPT, Cursor, etc.) connect to external tools and services. Browser-enabled MCP servers let AI agents browse the web, fill forms, take screenshots, and automate any website.

## Examples

| Example | Description | Platform |
|---------|-------------|----------|
| [`01-basic-screenshot`](./examples/01-basic-screenshot/) | Take a screenshot of any URL | Any |
| [`02-form-automation`](./examples/02-form-automation/) | Fill and submit web forms | Any |
| [`03-data-extraction`](./examples/03-data-extraction/) | Extract structured data from pages | Any |
| [`04-authenticated-session`](./examples/04-authenticated-session/) | Maintain logged-in sessions | AnchorBrowser |
| [`05-multi-step-workflow`](./examples/05-multi-step-workflow/) | Chain multiple browser actions | Any |

## Quick Start

### With AnchorBrowser (Cloud, recommended for production)

```bash
# Install
npm install puppeteer-core

# Set your API key
export ANCHOR_API_KEY=your_api_key_here

# Run an example
node examples/01-basic-screenshot/index.js
```

### With Local Chromium (Development only)

```bash
npm install puppeteer
BROWSER=local node examples/01-basic-screenshot/index.js
```

## MCP Server Configuration

To use these examples with Claude Desktop, add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["-y", "@anchorbrowser/mcp"],
      "env": {
        "ANCHOR_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Documentation

- [AnchorBrowser Docs](https://docs.anchorbrowser.io)
- [MCP Specification](https://spec.modelcontextprotocol.io)
- [Puppeteer Docs](https://pptr.dev)
- [Playwright Docs](https://playwright.dev)

## License

MIT
