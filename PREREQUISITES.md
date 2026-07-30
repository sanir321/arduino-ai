# System Prerequisites Checklist

## 1. Node.js
- **Required**: v18.17.0 - v20.x (not v21+)
- **Recommend**: v20 LTS via [nvm](https://github.com/nvm-sh/nvm)
  ```bash
  nvm install 20
  nvm use 20
  ```

## 2. Yarn (Classic)
```bash
npm install -g yarn
```

## 3. Linux System Libraries
```bash
sudo apt-get install -y \
  build-essential \
  libgtk-3-0 \
  libx11-xcb1 \
  libxkbfile1 \
  libxtst6 \
  libnss3 \
  libasound2 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libatk-bridge2.0-0 \
  libsecret-1-dev \
  libudev-dev \
  python3
```

## 4. macOS
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

## 5. Windows
Install "Build Tools for Visual Studio 2022" with "Desktop development with C++" workload.
