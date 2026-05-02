# RTL Free

RTL Free is a Chrome extension that fixes Arabic and right-to-left text direction on websites selected by the user.

It is designed for Arabic users who write or read mixed Arabic/English content in AI chat tools, forums, dashboards, and web applications where RTL text is not displayed correctly.

## Features

- Fixes Arabic and RTL text direction on enabled websites.
- Works per site after explicit user activation.
- Supports Arabic font selection and font size controls.
- Supports line height, letter spacing, and font weight settings.
- Improves Arabic typing in inputs, textareas, and editable fields.
- Includes a side panel workspace for preparing RTL text.
- Does not run on every website by default.
- Does not track users or send page content to external servers.

## Installation

### Chrome Web Store

The extension is prepared for Chrome Web Store publishing.

### Manual installation

1. Download the latest ZIP:
   https://github.com/futh2/rtlchat/raw/refs/heads/main/rtl-free-latest.zip
2. Extract the ZIP file.
3. Open Chrome and go to `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the extracted extension folder that contains `manifest.json`.

## Usage

1. Open a website that contains Arabic or mixed RTL/LTR text.
2. Click the RTL Free extension icon.
3. Click `Enable on this site`.
4. Approve Chrome's permission prompt for that website.
5. Adjust font, size, spacing, or direction settings from the popup.

The extension applies changes only on websites that the user enables.

## Permissions

RTL Free uses the following Chrome extension permissions:

- `storage`: saves user preferences such as enabled sites, font choice, size, line height, and RTL settings.
- `activeTab`: interacts with the current tab only after the user opens the extension or uses a command.
- `scripting`: injects the RTL correction script and CSS into websites explicitly enabled by the user.
- `contextMenus`: provides quick right-click actions.
- `sidePanel`: provides an optional RTL text workspace.
- Optional host permissions: requested only for a website selected by the user.

## Privacy

RTL Free processes webpage text locally in the browser to fix Arabic/RTL display issues. It does not sell, collect, or transmit personal data or page content.

Privacy policy:
https://rtlchat.com/privacy.html

## Project Links

- Website: https://rtlchat.com
- Repository: https://github.com/futh2/rtlchat
- Latest ZIP: https://github.com/futh2/rtlchat/raw/refs/heads/main/rtl-free-latest.zip

## Developer

Developed by Fudhail Alqahali (`futh2`).

Software developer interested in cloud applications and artificial intelligence. I enjoy learning new technologies and sharing knowledge.

- LinkedIn: https://www.linkedin.com/in/fudhailalqahali
- Email: fudhailalqahali@gmail.com

## Version

Current extension version: `1.1.7`
