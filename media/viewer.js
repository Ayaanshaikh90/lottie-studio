(function () {
    const vscode = acquireVsCodeApi();
    let animation = null;
    let isPlaying = false;
    let loopEnabled = true;
    let currentAnimationData = null;
    let darkTheme = false;
    let fpsInterval;
    let zoomLevel = 1;
    let isScrubbing = false;


    // DOM elements
    const playPauseBtn = document.getElementById('playPauseBtn');
    const restartBtn = document.getElementById('restartBtn');
    const loopToggleBtn = document.getElementById('loopToggleBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const seekSlider = document.getElementById('seekSlider');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const exportBtn = document.getElementById('exportBtn');
    const fpsCounter = document.getElementById('fpsCounter');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const fitBtn = document.getElementById('fitBtn');
    const saveLottieBtn = document.getElementById('saveLottieBtn');
    const player = document.getElementById('player');
    const framePreview = document.getElementById('framePreview'); // thumbnail canvas
    const timeline = document.getElementById('timeline');
    const progressBar = document.getElementById('progressBar');
    const scrubThumb = document.getElementById('scrubThumb');

    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 60;
    offscreenCanvas.height = 60;

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.type === 'load') {
            currentAnimationData = message.data;
            player.innerHTML = '';

            if (!window.lottie) {
                console.error('Lottie not loaded!');
                return;
            }

            animation = window.lottie.loadAnimation({
                container: player,
                renderer: 'svg',
                loop: loopEnabled,
                autoplay: true,
                animationData: currentAnimationData
            });

            isPlaying = true;
            playPauseBtn.textContent = 'Pause';
            zoomLevel = 1;
            updateZoom();

            setupFpsCounter(animation);

            animation.addEventListener('enterFrame', () => {
                const progress = (animation.currentFrame / animation.totalFrames) * 100;
                seekSlider.value = progress.toFixed(0);
                progressBar.style.width = progress + '%';
                scrubThumb.style.left = progress + '%';
            });
        }
    });

    playPauseBtn.addEventListener('click', () => {
        if (!animation) return;
        if (isPlaying) {
            animation.pause();
            playPauseBtn.textContent = 'Play';
        } else {
            animation.play();
            playPauseBtn.textContent = 'Pause';
        }
        isPlaying = !isPlaying;
    });

    restartBtn.addEventListener('click', () => {
        if (animation) {
            animation.goToAndPlay(0, true);
            if (!isPlaying) {
                animation.play();
                playPauseBtn.textContent = 'Pause';
                isPlaying = true;
            }
        }
    });

    loopToggleBtn.addEventListener('click', () => {
        if (animation) {
            loopEnabled = !loopEnabled;
            animation.loop = loopEnabled;
            loopToggleBtn.textContent = `Loop: ${loopEnabled ? 'On' : 'Off'}`;
            if (loopEnabled) {
                animation.goToAndPlay(0, true);
                if (!isPlaying) {
                    animation.play();
                    playPauseBtn.textContent = 'Pause';
                    isPlaying = true;
                }
            }
        }
    });

    speedSlider.addEventListener('input', e => {
        if (!animation) return;
        const speed = parseFloat(e.target.value);
        animation.setSpeed(speed);
        speedValue.textContent = speed.toFixed(1) + 'x';
    });

    seekSlider.addEventListener('input', e => {
        if (!animation) return;
        const frame = (parseInt(e.target.value) / 100) * animation.totalFrames;
        animation.goToAndStop(frame, true);
    });

    bgColorPicker.addEventListener('input', e => {
        player.style.backgroundColor = e.target.value;
    });

    themeToggleBtn.addEventListener('click', () => {
        darkTheme = !darkTheme;
        document.body.style.backgroundColor = darkTheme ? '#fff' : 'var(--vscode-editor-background)';
        fpsCounter.style.color = darkTheme ? '#000' : 'var(--vscode-editor-foreground)';
    });

    exportBtn.addEventListener('click', () => {
        if (!currentAnimationData) return;
        const blob = new Blob([JSON.stringify(currentAnimationData, null, 2)], { type: 'application/json' });
        downloadBlob(blob, 'animation.json');
    });

    saveLottieBtn.addEventListener('click', async () => {
        if (!currentAnimationData) return;
        try {
            const zip = new JSZip();
            zip.file('manifest.json', JSON.stringify({
                version: '1.0.0',
                author: 'Better Lottie Viewer',
                animations: [{ id: 'animation', url: 'animations/animation.json' }]
            }));
            zip.folder('animations').file('animation.json', JSON.stringify(currentAnimationData));
            const blob = await zip.generateAsync({ type: 'blob' });
            downloadBlob(blob, 'animation.lottie');
        } catch (e) {
            console.error('Error creating .lottie:', e);
        }
    });

    zoomInBtn.addEventListener('click', () => { zoomLevel += 0.1; updateZoom(); });
    zoomOutBtn.addEventListener('click', () => { zoomLevel = Math.max(0.1, zoomLevel - 0.1); updateZoom(); });
    fitBtn.addEventListener('click', () => { zoomLevel = 1; updateZoom(); });

    function updateZoom() {
        player.style.transform = `scale(${zoomLevel})`;
    }

    function setupFpsCounter(animationInstance) {
        let lastTime = performance.now();
        let frames = 0;
        if (fpsInterval) clearInterval(fpsInterval);
        fpsInterval = setInterval(() => {
            const now = performance.now();
            const delta = now - lastTime;
            const fps = frames / (delta / 1000);
            fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
            lastTime = now;
            frames = 0;
        }, 500);
        animationInstance.addEventListener('enterFrame', () => { frames++; });
    }


    timeline.addEventListener('mousedown', e => {
        if (!animation) return;
        isScrubbing = true;
        scrubToPosition(e);
    });

    document.addEventListener('mousemove', e => {
        if (isScrubbing && animation) {
            scrubToPosition(e);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isScrubbing) {
            isScrubbing = false;
        }
    });

    function scrubToPosition(e) {
        const rect = timeline.getBoundingClientRect();
        const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
        const percent = x / rect.width;
        const frame = percent * animation.totalFrames;

        animation.goToAndStop(frame, true);
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
        seekSlider.value = (percent * 100).toFixed(0);
        progressBar.style.width = percent * 100 + '%';
        scrubThumb.style.left = percent * 100 + '%';
    }


    async function renderFrameToCanvas(frame) {
        if (!animation) return;
        try {
            animation.goToAndStop(frame, true);
            // use offscreenCanvas to render
            const svgElement = player.querySelector('svg');
            if (svgElement) {
                const data = new XMLSerializer().serializeToString(svgElement);
                const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
                const img = new Image();
                img.onload = () => {
                    const ctx = framePreview.getContext('2d');
                    ctx.clearRect(0, 0, framePreview.width, framePreview.height);
                    ctx.drawImage(img, 0, 0, framePreview.width, framePreview.height);
                };
                img.src = url;
            }
        } catch (e) {
            console.error('Thumbnail render error:', e);
        }
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
})();
