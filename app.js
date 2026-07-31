document.addEventListener('DOMContentLoaded', () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const primaryBtn = document.getElementById('primary-download-btn');
    const downloadText = document.getElementById('download-btn-text');

    if (!primaryBtn || !downloadText) return;

    if (userAgent.includes('win')) {
        downloadText.textContent = 'Download for Windows (.exe)';
        primaryBtn.href = 'https://github.com/sanir321/arduino-ai/releases/download/v2.3.11/Arduino-AI-IDE-Setup-2.3.11.exe';
    } else if (userAgent.includes('mac')) {
        downloadText.textContent = 'Download for macOS (.dmg)';
        primaryBtn.href = 'https://github.com/sanir321/arduino-ai/releases/download/v2.3.11/Arduino-AI-IDE-2.3.11.dmg';
    } else if (userAgent.includes('linux')) {
        downloadText.textContent = 'Download for Linux (.AppImage)';
        primaryBtn.href = 'https://github.com/sanir321/arduino-ai/releases/download/v2.3.11/Arduino-AI-IDE-2.3.11-x86_64.AppImage';
    } else {
        downloadText.textContent = 'Download Arduino AI IDE';
        primaryBtn.href = '#downloads';
    }
});
