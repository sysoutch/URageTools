document.addEventListener('DOMContentLoaded', function() {
            window.registerDashboardThemeSync();
            // Get DOM elements
            const previewBox = document.getElementById('preview-box');
            const color1 = document.getElementById('color1');
            const color2 = document.getElementById('color2');
            const angle = document.getElementById('angle');
            const angleValue = document.getElementById('angle-value');
            const position = document.getElementById('position');
            const gradientType = document.getElementById('gradient-type');
            const animationType = document.getElementById('animation-type');
            const duration = document.getElementById('duration');
            const durationValue = document.getElementById('duration-value');
            const timing = document.getElementById('timing');
            const delay = document.getElementById('delay');
            const delayValue = document.getElementById('delay-value');
            const iteration = document.getElementById('iteration');
            const generateBtn = document.getElementById('generate-btn');
            const animateBtn = document.getElementById('animate-btn');
            const copyBtn = document.getElementById('copy-css');
            const copyCodeBtn = document.getElementById('copy-code');
            const cssOutput = document.getElementById('css-output');
            const colorOptions = document.querySelectorAll('.color-option');
            
            // Glass effect elements
            const blur = document.getElementById('blur');
            const blurValue = document.getElementById('blur-value');
            const opacity = document.getElementById('opacity');
            const opacityValue = document.getElementById('opacity-value');
            const applyGlassBtn = document.getElementById('apply-glass');
            const resetGlassBtn = document.getElementById('reset-glass');
            
            // Initialize
            updatePreview();
            
            // Event listeners
            color1.addEventListener('input', updatePreview);
            color2.addEventListener('input', updatePreview);
            angle.addEventListener('input', function() {
                angleValue.textContent = this.value + '°';
                updatePreview();
            });
            position.addEventListener('change', updatePreview);
            gradientType.addEventListener('change', updatePreview);
            animationType.addEventListener('change', updatePreview);
            duration.addEventListener('input', function() {
                durationValue.textContent = this.value + 's';
                updatePreview();
            });
            timing.addEventListener('change', updatePreview);
            delay.addEventListener('input', function() {
                delayValue.textContent = this.value + 's';
                updatePreview();
            });
            iteration.addEventListener('change', updatePreview);
            generateBtn.addEventListener('click', updatePreview);
            animateBtn.addEventListener('click', applyAnimation);
            copyBtn.addEventListener('click', copyCSS);
            copyCodeBtn.addEventListener('click', copyCSSCode);
            
            // Color palette click
            colorOptions.forEach(option => {
                option.addEventListener('click', function() {
                    const color = this.getAttribute('data-color');
                    if (this === colorOptions[0]) {
                        color1.value = color;
                    } else {
                        color2.value = color;
                    }
                    updatePreview();
                });
            });
            
            // Glass effect controls
            blur.addEventListener('input', function() {
                blurValue.textContent = this.value + 'px';
                updatePreview();
            });
            
            opacity.addEventListener('input', function() {
                opacityValue.textContent = Math.round(this.value * 100) + '%';
                updatePreview();
            });
            
            applyGlassBtn.addEventListener('click', applyGlassEffect);
            resetGlassBtn.addEventListener('click', resetGlassEffect);
            
            // Update preview function
            function updatePreview() {
                const type = gradientType.value;
                const c1 = color1.value;
                const c2 = color2.value;
                const ang = angle.value;
                const pos = position.value;
                const dur = duration.value;
                const tm = timing.value;
                const del = delay.value;
                const iter = iteration.value;
                const blurVal = blur.value;
                const opacityVal = opacity.value;
                
                let gradient = '';
                
                switch(type) {
                    case 'linear':
                        gradient = `linear-gradient(${ang}deg, ${c1}, ${c2})`;
                        break;
                    case 'radial':
                        gradient = `radial-gradient(${pos}, ${c1}, ${c2})`;
                        break;
                    case 'conic':
                        gradient = `conic-gradient(${c1}, ${c2})`;
                        break;
                }
                
                previewBox.style.background = gradient;
                
                // Apply glass effect if active
                if (previewBox.classList.contains('glass-effect')) {
                    previewBox.style.backdropFilter = `blur(${blurVal}px)`;
                    previewBox.style.opacity = opacityVal;
                }
                
                // Update CSS output
                let animationCSS = '';
                if (animationType.value !== 'none') {
                    const animationName = getAnimationName();
                    animationCSS = `
    animation: ${animationName} ${dur}s ${tm} ${del}s ${iter};`;
                }
                
                let glassCSS = '';
                if (previewBox.classList.contains('glass-effect')) {
                    glassCSS = `
    backdrop-filter: blur(${blurVal}px);
    opacity: ${opacityVal};`;
                }
                
                const css = `background: ${gradient};${glassCSS}${animationCSS}`;
                cssOutput.textContent = css;
            }
            
            // Apply animation
            function applyAnimation() {
                const type = animationType.value;
                const dur = duration.value;
                const tm = timing.value;
                const del = delay.value;
                const iter = iteration.value;
                
                if (type === 'none') {
                    previewBox.style.animation = 'none';
                    return;
                }
                
                const animationName = getAnimationName();
                
                // Create keyframes dynamically
                const style = document.createElement('style');
                style.innerHTML = `
                    @keyframes ${animationName} {
                        0% { transform: scale(1); }
                        25% { transform: scale(1.05); }
                        50% { transform: scale(1); }
                        75% { transform: scale(0.95); }
                        100% { transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
                
                previewBox.style.animation = `${animationName} ${dur}s ${tm} ${del}s ${iter}`;
            }
            
            // Get animation name
            function getAnimationName() {
                return 'anim_' + Math.floor(Math.random() * 10000);
            }
            
            // Apply glass effect
            function applyGlassEffect() {
                previewBox.classList.add('glass-effect');
                updatePreview();
            }
            
            // Reset glass effect
            function resetGlassEffect() {
                previewBox.classList.remove('glass-effect');
                blur.value = 10;
                opacity.value = 0.7;
                blurValue.textContent = '10px';
                opacityValue.textContent = '70%';
                updatePreview();
            }
            
            // Copy CSS to clipboard
            function copyCSS() {
                const css = cssOutput.textContent;
                navigator.clipboard.writeText(css).then(() => {
                    alert('CSS copied to clipboard!');
                });
            }
            
            // Copy CSS code
            function copyCSSCode() {
                const css = cssOutput.textContent;
                navigator.clipboard.writeText(css).then(() => {
                    alert('CSS copied to clipboard!');
                });
            }

            function describeCurrentAssets() {
                const css = cssOutput.textContent || '';
                return [{
                    kind: 'text',
                    title: 'Generated CSS Background',
                    fileName: 'generated-background.css',
                    mimeType: 'text/css',
                    textContent: css,
                    previewKind: 'text',
                    previewText: css,
                    sourceDetail: 'Generated CSS background style.',
                    metadata: { sourceTool: 'css-background-generator', resourceFormat: 'css' }
                }];
            }

            window.__urageToolDescribeCurrentAssets = describeCurrentAssets;
            window.__urageToolDescribeCurrentAsset = () => describeCurrentAssets()[0] || null;
        });