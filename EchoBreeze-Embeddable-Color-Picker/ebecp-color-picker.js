/**
 * @file EchoBreeze Embeddable Color Picker (ebecp) v1.1.0
 * A robust, accessible, and embeddable color picker module with i18n support.
 * @license MIT
 */

const ColorPickerModule = (() => {
    'use strict';

    // --- DOM Element Cache ---
    const moduleElement = document.getElementById('ebecp-module-wrapper');
    if (!moduleElement) {
        console.error('EBECP Error: The module wrapper with ID "ebecp-module-wrapper" was not found in the DOM.');
        return { open: () => console.error('EBECP not initialized.'), setLocale: () => {} };
    }
    const overlay = moduleElement.querySelector('.picker-overlay');
    const elements = { 
        wheel: document.getElementById('ebecp-color-wheel'), 
        lightnessSlider: document.getElementById('ebecp-lightness-slider'), 
        wheelCtx: document.getElementById('ebecp-color-wheel').getContext('2d',{willReadFrequently:true}), 
        lightnessCtx: document.getElementById('ebecp-lightness-slider').getContext('2d'), 
        wheelWrapper: moduleElement.querySelector('.color-wheel-wrapper'), 
        pickerCursor: document.getElementById('ebecp-picker-cursor'), 
        lightnessCursor: document.getElementById('ebecp-lightness-cursor'), 
        alphaSlider: document.getElementById('ebecp-alpha-slider'), 
        eyedropperBtn: document.getElementById('ebecp-eyedropper-btn'), 
        previewOverlay: document.getElementById('ebecp-preview-overlay'), 
        colorInputs: moduleElement.querySelectorAll('.color-outputs input'), 
        originalSwatchWrapper: document.getElementById('ebecp-original-swatch-wrapper'), 
        originalSwatch: document.getElementById('ebecp-original-swatch'), 
        previousSwatch: document.getElementById('ebecp-previous-swatch'), 
        currentSwatch: document.getElementById('ebecp-current-swatch'), 
        restoreBtn: document.getElementById('ebecp-restore-btn'), 
        comparisonBackground: document.getElementById('ebecp-comparison-background'), 
        changeBgBtn: document.getElementById('ebecp-change-bg-btn'), 
        originalIndicator: document.getElementById('ebecp-original-indicator'), 
        previousIndicator: document.getElementById('ebecp-previous-indicator'), 
        currentIndicator: document.getElementById('ebecp-current-indicator'), 
    };

    // --- State Management ---
    let colorState = { h: 0, s: 1, l: 0.5, a: 1 };
    let originalColorState = {};
    let previousColorState = {};
    let swatchStateCache = {};
    let onConfirmCallback = null;
    let isDraggingWheel = false, isDraggingLightness = false;
    let editMode = 'swatch';

    // --- Internationalization (i18n) ---
    const locales = {
        en: { original: 'Original', previous: 'Previous', current: 'Current', brightness: 'Brightness', transparency: 'Transparency', restoreColor: 'Restore Color', copyHint: 'Hint: click any color value to copy.', copied: 'Copied!', eyedropperTitle: 'Pick color from page', changeBgTitle: 'Toggle edit mode', resetTitle: 'Click to restore original color' },
        zh: { original: '原始', previous: '上次', current: '当前', brightness: '亮度', transparency: '透明度', restoreColor: '恢复颜色', copyHint: '提示：点击任意颜色代码即可复制。', copied: '已复制!', eyedropperTitle: '滴管工具', changeBgTitle: '切换编辑模式', resetTitle: '点击恢复到原始颜色' }
    };
    let currentLocale = 'zh';

    /**
     * Sets the component's language and updates the UI.
     * @param {string} lang - The language key (e.g., 'en', 'zh').
     */
    function setLocale(lang) {
        currentLocale = locales[lang] ? lang : 'en';
        localizeUI();
    }

    /** Translates a key into the current language. */
    function t(key) { return locales[currentLocale]?.[key] || key; }
    
    /** Scans the component and updates all text based on the current locale. */
    function localizeUI() {
        moduleElement.querySelectorAll('[data-i18n-key]').forEach(el => {
            el.textContent = t(el.dataset.i18nKey);
        });
        moduleElement.querySelectorAll('[data-i18n-title-key]').forEach(el => {
            el.title = t(el.dataset.i18nTitleKey);
        });
    }

    /**
     * Opens and initializes the color picker module.
     * @param {object} config - Configuration object.
     * @param {string} config.originalColor - The original, unchanging color value.
     * @param {string} config.currentColor - The color to start editing from.
     * @param {function} config.onConfirm - Callback fired when a color is confirmed.
     * @param {string} [config.lang='zh'] - Sets the initial language of the UI.
     */
    function open(config) {
        const { originalColor, currentColor, onConfirm, lang } = config;
        setLocale(lang || 'zh');
        
        const [r_curr, g_curr, b_curr, a_curr] = parseColor(currentColor);
        const [h,s,l] = rgbToHsl(r_curr, g_curr, b_curr);
        const currentHsla = {h,s,l,a: a_curr};
        
        Object.assign(colorState, currentHsla);
        previousColorState = { ...currentHsla };
        swatchStateCache = { ...currentHsla };

        const [r_orig, g_orig, b_orig, a_orig] = parseColor(originalColor);
        const [h_orig,s_orig,l_orig] = rgbToHsl(r_orig, g_orig, b_orig);
        originalColorState = {h:h_orig, s:s_orig, l:l_orig, a: a_orig};
        
        onConfirmCallback = onConfirm;
        
        elements.originalSwatch.style.backgroundColor = `rgba(${r_orig},${g_orig},${b_orig},${a_orig})`;
        elements.previousSwatch.style.backgroundColor = `rgba(${r_curr},${g_curr},${b_curr},${a_curr})`;
        elements.originalIndicator.classList.toggle('is-visible', a_orig < 1);
        elements.previousIndicator.classList.toggle('is-visible', a_curr < 1);
        
        moduleElement.classList.add('is-open');
        setEditMode('swatch');
        initialize();
    }
        /** Confirms the color selection and closes the module. */
    function confirm() {
        if (onConfirmCallback) {
            const finalState = (editMode === 'background') ? previousColorState : swatchStateCache;
            onConfirmCallback(finalState);
        }
        close();
    }

    /** Closes the module without saving changes. */
    function close() {
        moduleElement.classList.remove('is-open');
        onConfirmCallback = null;
    }

    /** Initializes or re-initializes canvas sizes and drawings. */
    function initialize() {
        const size = elements.wheelWrapper.clientWidth;
        if (size === 0) return; // Don't initialize if hidden
        elements.wheel.width = elements.wheel.height = size;
        elements.lightnessSlider.width = size;
        drawColorWheel(colorState.l);
        drawLightnessBar();
        render();
    }

    /** Renders all UI elements based on the current colorState. */
    function render() {
        const { h, s, l, a } = colorState;
        const [r, g, b] = hslToRgb(h, s, l);
        const rgbaString = `rgba(${r}, ${g}, ${b}, ${a})`;
        
        elements.previewOverlay.style.backgroundColor = rgbaString;
        
        if (editMode === 'swatch') {
            elements.currentSwatch.style.backgroundColor = rgbaString;
            elements.currentIndicator.classList.toggle('is-visible', a < 1);
            swatchStateCache = { ...colorState };
        } else {
            elements.comparisonBackground.style.backgroundColor = rgbaString;
        }
        
        const radius = elements.wheel.width / 2;
        const angle = h * 2 * Math.PI;
        const distance = s * radius;
        elements.pickerCursor.style.left = `${radius + distance * Math.cos(angle)}px`;
        elements.pickerCursor.style.top = `${radius + distance * Math.sin(angle)}px`;
        elements.lightnessCursor.style.left = `${l * elements.lightnessSlider.width}px`;
        elements.alphaSlider.value = a;
        
        updateTextInputs({ r, g, b, a });
    }

    /** Toggles between 'swatch' and 'background' editing modes. */
    function setEditMode(mode) {
        editMode = mode;
        moduleElement.classList.toggle('mode-background', mode === 'background');
        
        if (mode === 'background') {
            const [r,g,b,a] = parseColor(window.getComputedStyle(elements.comparisonBackground).backgroundColor);
            const [h,s,l] = rgbToHsl(r,g,b);
            Object.assign(colorState, {h,s,l,a});
        } else {
            Object.assign(colorState, swatchStateCache);
        }
        drawColorWheel(colorState.l);
        render();
    }

    /** Draws the color wheel based on a given lightness. */
    function drawColorWheel(lightness = 0.5) {
        const size = elements.wheel.width, radius = size / 2;
        if (!size) return;
        const imageData = elements.wheelCtx.createImageData(size, size);
        const data = imageData.data;
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                const dx = x - radius, dy = y - radius, dist = Math.sqrt(dx*dx + dy*dy);
                if (dist <= radius) {
                    const angle = Math.atan2(dy, dx), hue = (angle / (2 * Math.PI) + 1) % 1, sat = dist / radius;
                    const [r, g, b] = hslToRgb(hue, sat, lightness);
                    const i = (y * size + x) * 4;
                    data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
                }
            }
        }
        elements.wheelCtx.putImageData(imageData, 0, 0);
    }

    /** Draws the black-to-white lightness slider. */
    function drawLightnessBar() {
        const w = elements.lightnessSlider.width, h = elements.lightnessSlider.height;
        if (!w || !h) return;
        const grad = elements.lightnessCtx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'black'); grad.addColorStop(0.5, '#808080'); grad.addColorStop(1, 'white');
        elements.lightnessCtx.fillStyle = grad;
        elements.lightnessCtx.fillRect(0, 0, w, h);
    }

    // --- Event Handlers & Listeners ---
    function handleWheelMove(coords) {
        const rect = elements.wheel.getBoundingClientRect(), radius = elements.wheel.width / 2;
        let x = coords.x - rect.left, y = coords.y - rect.top;
        const dx = x - radius, dy = y - radius; let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > radius) dist = radius;
        const angle = Math.atan2(dy, dx);
        colorState.h = (angle / (2 * Math.PI) + 1) % 1;
        colorState.s = dist / radius;
        if (colorState.l === 1 || colorState.l === 0) {
            colorState.l = 0.5;
        }
        render();
    }
    
    function handleLightnessMove(coords) {
        const rect = elements.lightnessSlider.getBoundingClientRect();
        let x = coords.x - rect.left;
        x = Math.max(0, Math.min(x, elements.lightnessSlider.width));
        colorState.l = x / elements.lightnessSlider.width;
        drawColorWheel(colorState.l);
        render();
    }
        elements.originalSwatchWrapper.addEventListener('click', () => { if (editMode === 'swatch') { Object.assign(colorState, originalColorState); drawColorWheel(colorState.l); render(); } });
    elements.restoreBtn.addEventListener('click', () => { if (editMode === 'swatch') { Object.assign(colorState, previousColorState); drawColorWheel(colorState.l); render(); } });
    elements.changeBgBtn.addEventListener('click', () => { setEditMode(editMode === 'swatch' ? 'background' : 'swatch'); });
    overlay.addEventListener('click', confirm);
    
    function debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; }
    function getEventCoords(event) { if (event.touches) return { x: event.touches[0].clientX, y: event.touches[0].clientY }; return { x: event.clientX, y: event.clientY }; }
    
    function updateTextInputs({ r, g, b, a }) { 
        const alphaFixed = a.toFixed(2); 
        elements.colorInputs.forEach(input => { 
            const formatId = input.id; 
            switch(formatId) { 
                case 'ebecp-hexa-code': input.value = rgbToHex(r, g, b, a); break; 
                case 'ebecp-rgba-code': input.value = `${r}, ${g}, ${b}, ${alphaFixed}`; break; 
                case 'ebecp-hsla-code': const [h,s,l] = rgbToHsl(r,g,b); input.value = `${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%, ${alphaFixed}`; break; 
                case 'ebecp-hsv-code': const [hsvH,hsvS,hsvV] = rgbToHsv(r,g,b); input.value = `${Math.round(hsvH*360)}, ${Math.round(hsvS*100)}%, ${Math.round(hsvV*100)}%`; break; 
                case 'ebecp-float-code': input.value = `${(r/255).toFixed(3)}, ${(g/255).toFixed(3)}, ${(b/255).toFixed(3)}, ${alphaFixed}`; break; 
                case 'ebecp-int-code': input.value = `${r}, ${g}, ${b}, ${Math.round(a*255)}`; break; 
            } 
        }); 
    }

    function addDragListeners(element, onStart, onMove) { 
        const startHandler = (e) => { onStart(true); onMove(getEventCoords(e)); }; 
        const moveHandler = (e) => { if (onStart()) { e.preventDefault(); onMove(getEventCoords(e)); } }; 
        element.addEventListener('mousedown', startHandler); 
        element.addEventListener('touchstart', startHandler, { passive: false }); 
        document.addEventListener('mousemove', moveHandler); 
        document.addEventListener('touchmove', moveHandler, { passive: false }); 
    }
    
    addDragListeners(elements.wheel, (val) => val === undefined ? isDraggingWheel : (isDraggingWheel = val), handleWheelMove);
    addDragListeners(elements.lightnessSlider, (val) => val === undefined ? isDraggingLightness : (isDraggingLightness = val), handleLightnessMove);
    document.addEventListener('mouseup', () => { isDraggingWheel = false; isDraggingLightness = false; }); 
    document.addEventListener('touchend', () => { isDraggingWheel = false; isDraggingLightness = false; });
    
    elements.alphaSlider.addEventListener('input', (e) => { colorState.a = parseFloat(e.target.value); render(); });
    
    elements.wheel.addEventListener('keydown', (e) => { 
        const step = e.shiftKey ? 0.05 : 0.01; 
        let u = false; 
        switch (e.key) { 
            case 'ArrowLeft': colorState.h = (colorState.h-step+1)%1; u=true; break; 
            case 'ArrowRight': colorState.h = (colorState.h+step)%1; u=true; break; 
            case 'ArrowUp': colorState.s = Math.min(1, colorState.s+step); u=true; break; 
            case 'ArrowDown': colorState.s = Math.max(0, colorState.s-step); u=true; break; 
        } 
        if (u) { e.preventDefault(); render(); } 
    });

    elements.lightnessSlider.addEventListener('keydown', (e) => { 
        const step = e.shiftKey ? 0.05 : 0.01; 
        let u = false; 
        switch (e.key) { 
            case 'ArrowLeft': colorState.l = Math.max(0, colorState.l-step); u=true; break; 
            case 'ArrowRight': colorState.l = Math.min(1, colorState.l+step); u=true; break; 
        } 
        if (u) { e.preventDefault(); drawColorWheel(colorState.l); render(); } 
    });

    if ('EyeDropper' in window) { 
        const ed = new window.EyeDropper(); 
        elements.eyedropperBtn.addEventListener('click', () => { 
            ed.open().then(res => { 
                const {r,g,b} = hexToRgb(res.sRGBHex); 
                const [h,s,l] = rgbToHsl(r,g,b); 
                Object.assign(colorState, {h,s,l,a:1}); 
                drawColorWheel(l); 
                render(); 
            }).catch(e => console.log('EyeDropper closed.'));
        }); 
    } else { 
        elements.eyedropperBtn.style.display = 'none'; 
    }
    
    elements.colorInputs.forEach(input => { 
        input.addEventListener('click', function() { 
            const originalValue = this.value; 
            navigator.clipboard.writeText(originalValue).then(() => { 
                this.value = t('copied'); 
                this.style.backgroundColor = '#e8f0fe'; 
                setTimeout(() => { 
                    this.value = originalValue; 
                    this.style.backgroundColor = ''; 
                }, 1000); 
            }); 
        }); 
    });
    
    // --- Color Conversion Utilities ---
    function hslToRgb(h,s,l){let r,g,b;if(s===0)r=g=b=l*255;else{const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3)*255;g=hue2rgb(p,q,h)*255;b=hue2rgb(p,q,h-1/3)*255}return[Math.round(r),Math.round(g),Math.round(b)]}
    function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min)h=s=0;else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}h/=6}return[h,s,l]}
    function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,v=max;const d=max-min;s=max===0?0:d/max;if(max===min)h=0;else{switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break}h/=6}return[h,s,v]}
    function rgbToHex(r,g,b,a){const toHex=c=>('0'+Math.round(c).toString(16)).slice(-2);let hex=`#${toHex(r)}${toHex(g)}${toHex(b)}`;if(a!==1&&a!==undefined)hex+=toHex(a*255);return hex.toUpperCase()}
    function hexToRgb(hex){const result=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);if(!result)return{r:0,g:0,b:0,a:1};return{r:parseInt(result[1],16),g:parseInt(result[2],16),b:parseInt(result[3],16),a:result[4]?parseInt(result[4],16)/255:1}}
    function parseColor(colorString){if(typeof colorString==='string'&&colorString.startsWith('rgb')){const parts=colorString.match(/[\d.]+/g);if(parts&&parts.length>=3)return[+parts[0],+parts[1],+parts[2],parts[3]?+parts[3]:1]}if(typeof colorString==='string'&&colorString.startsWith('#')){const{r,g,b,a}=hexToRgb(colorString);return[r,g,b,a]}return[0,0,0,1]}
    
    // --- Window Resize Listener ---
    window.addEventListener('resize', debounce(initialize, 150));
    
    // --- Public API ---
    return { open, setLocale };
})();