pkg update -y && pkg upgrade -y && \
pkg install -y nodejs git && \
cd ~ && \
git clone https://github.com/zxoman/rat_controle.git && \
cd rat_controle && \
npm install && \
echo '
cd ~/rat_controle
node server.js' > ~/start.sh
chmod +x start.sh
echo 'bash ~/start.sh' > ~/.bashrc
