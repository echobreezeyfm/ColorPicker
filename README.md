# EchoBreeze Embeddable Color Picker (EBECP) v1.1.0

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A lightweight, robust, and highly customizable embeddable color picker module. Zero dependencies, designed for modern web projects with a focus on unparalleled user experience and developer friendliness.

---

## ✨ Features

*   🎨 **Three-way Color Comparison:** Intuitively compare "Original", "Previous", and "Current" colors.
*   🖼️ **Dynamic Preview Background:** Change the preview area's background on the fly to simulate real-world environments.
*   ⌨️ **Full Keyboard Accessibility:** Precisely control the color wheel and sliders using arrow keys.
*   🛡️ **Robust CSS/JS Encapsulation:** Uses a unique `ebecp-` prefix to prevent any style or ID conflicts when embedded in complex pages.
*   💡 **Smart Interaction Logic:** Includes features like "Restore Color" and "Click Original to Reset" for an enhanced workflow.
*   💧 **Built-in Eyedropper:** Pick colors from anywhere on the screen (requires browser `EyeDropper API` support).
*   🌐 **i18n Ready:** Built-in support for multiple languages (English & Chinese included).
*   📱 **Responsive & Touch-Friendly:** Delivers a consistent and excellent experience on both desktop and mobile devices.
*   🚀 **Zero Dependencies:** Written in pure, vanilla JavaScript.

---

## 🚀 Quick Start

Integrating EBECP into your project is a simple three-step process.

### Step 1: Link the Files

In the `<head>` of your HTML document, link to the CSS and JS files.

```html
<head>
    <!-- ... -->
    <link rel="stylesheet" href="path/to/ebecp-color-picker.css">
    <script src="path/to/ebecp-color-picker.js"></script>
</head>
```

### Step 2: Paste the HTML Structure

Copy the entire content of `ebecp-color-picker.html` and paste it just before the closing `</body>` tag of your main HTML file.

### Step 3: Call it with JavaScript

Now you can easily invoke the color picker from your own scripts.

```javascript
// Example: Get your color swatch element
const mySwatch = document.querySelector('.my-swatch');

// Add a click listener to it
mySwatch.addEventListener('click', () => {
    // Call the module's open method
    ColorPickerModule.open({
        // The original color that never changes
        originalColor: mySwatch.dataset.originalColor,
        // The color to start editing from
        currentColor: mySwatch.dataset.currentColor,
        // Optional: Set the language ('en' or 'zh')
        lang: 'en', 
        // A callback that receives the final color state upon confirmation
        onConfirm: (finalState) => {
            // finalState is an object: { h, s, l, a } (values 0-1)
            // Use it to update your UI
            console.log('New color selected:', finalState);
            // e.g., updateMySwatchUI(finalState);
        }
    });
});
```

---

## 📖 API

### `ColorPickerModule.open(config)`
Opens and initializes the color picker module.

**Parameters:**
`config` (Object): A configuration object with the following properties:

*   `originalColor` (String, **Required**): The base color, used for the "Original" preview and the "reset" action. Supported formats: `#RRGGBB`, `#RRGGBBAA`, `rgb()`, `rgba()`.
*   `currentColor` (String, **Required**): The color to start editing from. Same format support.
*   `onConfirm` (Function, **Required**): A callback function that receives the final `colorState` object upon confirmation (when clicking outside the picker). The `colorState` object is in the format `{ h, s, l, a }`, with all values normalized between `0` and `1`.
*   `lang` (String, *Optional*): Sets the UI language. Defaults to `'zh'`. Supported values: `'en'`, `'zh'`.

### `ColorPickerModule.setLocale(lang)`
Globally sets the language for all subsequent picker openings, if you prefer not to set it in each `open` call.
* `lang` (String): `'en'` or `'zh'`.

---

## 👥 Authors

This project was co-created by **EchoBreeze** and **Google's large language model**.

The core concepts, feature requests, user experience refinements, and meticulous bug hunting were all driven by echobreeze. The AI served as a real-time programming partner, translating these brilliant ideas into robust, professional-grade code.

---

## 📜 License

This project is licensed under the **MIT** License. See the `LICENSE` file for details.
