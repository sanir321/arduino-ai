document.addEventListener('DOMContentLoaded', () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const heroBtn = document.getElementById('hero-download-btn');

    if (!heroBtn) return;

    const spanText = heroBtn.querySelector('span');

    if (userAgent.includes('win')) {
        if (spanText) spanText.textContent = 'Download for Windows';
    } else if (userAgent.includes('mac')) {
        if (spanText) spanText.textContent = 'Download for macOS';
    } else if (userAgent.includes('linux')) {
        if (spanText) spanText.textContent = 'Download for Linux';
    } else {
        if (spanText) spanText.textContent = 'Download Arduino AI IDE';
    }
    heroBtn.href = 'https://github.com/sanir321/arduino-ai/releases';
});
