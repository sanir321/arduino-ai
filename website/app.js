document.addEventListener('DOMContentLoaded', () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const heroBtn = document.getElementById('hero-download-btn');

    if (!heroBtn) return;

    const spanText = heroBtn.querySelector('span');

    if (userAgent.includes('win')) {
        if (spanText) spanText.textContent = 'Download for Windows';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/latest';
    } else if (userAgent.includes('mac')) {
        if (spanText) spanText.textContent = 'Download for macOS';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/latest';
    } else if (userAgent.includes('linux')) {
        if (spanText) spanText.textContent = 'Download for Linux';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/latest';
    } else {
        if (spanText) spanText.textContent = 'Download Arduino AI IDE';
        heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases/latest';
    }
});
