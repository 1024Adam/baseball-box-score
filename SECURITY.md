# Security Policy

## Overview

**Baseball Box Score** is a local-first, offline mobile and web application. All game logs and player statistics are stored locally on the user's device (`SQLite` on iOS / `localStorage` in the browser).

## Handling Sensitive Configuration

- **Never commit secrets or personal URLs**: Do not commit personal Google Apps Script Webhook URLs, API keys, or `.env.local` files to the repository.
- Any external webhook URLs should only be entered at runtime via the app's local preferences store.

## Reporting a Vulnerability

If you discover a security issue or dependency vulnerability in this repository, please open a private security advisory on GitHub (`Security -> Advisories -> New draft security advisory`) rather than posting sensitive exploit details in a public issue.
