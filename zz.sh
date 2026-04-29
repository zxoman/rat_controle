pkg update -y && pkg upgrade -y && \
pkg install -y nodejs git && \
cd ~ && \
git clone https://github.com/zxoman/rat_controle.git && \
cd rat_controle && \
npm install && \
echo '#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/rat_controle
node server.js' > ~/.bashrc && \
