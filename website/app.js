document.addEventListener('DOMContentLoaded', () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const heroBtn = document.getElementById('hero-download-btn');

    if (!heroBtn) return;

    const spanText = heroBtn.querySelector('span');

    if (userAgent.includes('win')) {
        if (spanText) spanText.textContent = 'Download for Windows (.exe)';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/download/v2.3.11/Arduino-AI-IDE-Setup-2.3.11.exe';
    } else if (userAgent.includes('mac')) {
        if (spanText) spanText.textContent = 'Download for macOS (.dmg)';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/download/v2.3.11/Arduino-AI-IDE-2.3.11.dmg';
    } else if (userAgent.includes('linux')) {
        if (spanText) spanText.textContent = 'Download for Linux (.AppImage)';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/download/v2.3.11/Arduino-AI-IDE-2.3.11-x86_64.AppImage';
    } else {
        if (spanText) spanText.textContent = 'Download Arduino AI IDE';
        heroBtn.href = '#downloads';
    }
});
