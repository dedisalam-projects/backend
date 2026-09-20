---
name: baileys-whatsapp-pattern
description: "Use when evaluating, designing, or implementing an unofficial WhatsApp integration in Node.js — decision matrix between Baileys and whatsapp-web.js"
tier: local
target-stacks: ["nodejs", "typescript"]
metadata:
  origin: auto-extracted
---

# Baileys vs whatsapp-web.js Architectural Pattern

**Extracted:** 2026-09-20
**Context:** Deciding which WhatsApp library to use for a Node.js project.

## Problem
Developers often need to integrate WhatsApp into their systems but must choose between `baileys` and `whatsapp-web.js`. Making the wrong choice can lead to high server costs (RAM/CPU exhaustion) or unexpected complexity during implementation.

## Solution
Apply this decision matrix and architectural pattern to select the right library based on scale and resource constraints.

### 1. The Baileys Pattern (Production & Scale)
`@whiskeysockets/baileys` communicates directly via WebSockets.

**When to choose:**
- Running multiple WhatsApp accounts/sessions concurrently.
- Deploying to resource-constrained environments (low RAM VPS).
- You need high throughput and fast message processing.

**Architecture:**
- **No Browser:** Uses native Node.js crypto and websockets.
- **Resource Footprint:** Very low (~50MB RAM per session).

### 2. The whatsapp-web.js Pattern (Prototyping & Simplicity)
`whatsapp-web.js` automates a hidden Chromium instance via Puppeteer.

**When to choose:**
- Building a quick prototype or personal bot.
- You only need to run a single WhatsApp account.
- Developer experience and rapid development are prioritized over server efficiency.

**Architecture:**
- **Headless Browser:** Requires Puppeteer/Chromium.
- **Resource Footprint:** Very high (hundreds of MBs to >1GB RAM per session).

### Critical Rules (Risk Mitigation)
- **Unofficial API Risk:** Both libraries reverse-engineer WhatsApp. Meta actively monitors and bans automated accounts. NEVER use a primary business or personal number for these bots.
- **Cloud API Alternative:** If building for enterprise or mission-critical systems, always default to the official WhatsApp Cloud API (which requires business verification).

## When to Use
Use this pattern when a project requires a WhatsApp integration and you need to select the appropriate library to balance developer speed against production resource constraints.
