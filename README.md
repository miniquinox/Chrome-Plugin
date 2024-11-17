# Chrome Plugin: Swift Code Problem Solver

This Chrome plugin allows you to capture a screenshot of your current browser tab, send the image to OpenAI's GPT API, and get a Swift solution for any code-related problem displayed in the image. The solution is automatically displayed in a floating window with syntax highlighting.

## Features
- Capture screenshots directly from Chrome.
- Automatically sends the screenshot to GPT and displays the Swift solution.
- Syntax highlighting for Swift code using Prism.js.

## Installation

### Step 1: Download the Plugin
1. Go to the [Chrome-Plugin GitHub repository](https://github.com/miniquinox/Chrome-Plugin).
2. Click the green **Code** button and select **Download ZIP**.
3. Unzip the downloaded file.

### Step 2: Add the Plugin to Chrome
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer Mode** (toggle in the top right corner).
3. Click the **Load unpacked** button.
4. Select the folder you just unzipped.
5. The plugin will now be installed and listed in your extensions.

## Usage
1. Open any page in Chrome.
2. Press **Cmd+Shift+Y** (Mac) or **Ctrl+Shift+Y** (Windows/Linux).
3. A floating window will appear with:
   - The screenshot of your current tab.
   - A Swift solution to the problem shown in the image.

> **Note:** This plugin is designed for **Swift-related problems** only.

## Troubleshooting
- If the plugin doesn’t appear in `chrome://extensions/`, ensure all files are present in the folder (including `manifest.json` and required libraries in the `libs/` folder).
- If the shortcut doesn’t work, check if another app or extension is using the same key combination.

## License
This project is licensed under the MIT License.
