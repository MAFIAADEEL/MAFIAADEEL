const { makeid } = require('./gen-id');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
let router = express.Router();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    async function MAFIA_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {            
            let sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                browser: Browsers.macOS("Safari")
            });
            
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;
                
                if (qr) await res.end(await QRCode.toBuffer(qr));
                
                if (connection == "open") {
                    await delay(5000);
                    let rf = __dirname + `/temp/${id}/creds.json`;
                    
                    try {
                        // Upload session file
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let sessionId = "MAFIA-MD~" + string_session;
                        
                        // Send session ID
                        const sessionMsg = await sock.sendMessage(sock.user.id, { 
                            text: sessionId 
                        });
                        
                        // Reply with warning
                        await sock.sendMessage(sock.user.id, { 
                            text: "⚠️ WARNING: This is your session ID. DO NOT SHARE IT WITH ANYONE!",
                            quoted: sessionMsg
                        });

                        await sock.ws.close();
                        await removeFile('./temp/' + id);
                        process.exit();
                        
                    } catch (e) {
                        // Send error message
                        const errorMsg = await sock.sendMessage(sock.user.id, { 
                            text: `Error: ${e.toString()}` 
                        });
                        
                        // Reply with warning
                        await sock.sendMessage(sock.user.id, { 
                            text: "⚠️ WARNING: This error may contain sensitive information. DO NOT SHARE IT!",
                            quoted: errorMsg
                        });

                        await sock.ws.close();
                        await removeFile('./temp/' + id);
                        process.exit();
                    }
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    MAFIA_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }
    await MAFIA_MD_PAIR_CODE();
});

// Optional: Restart process every 30 minutes
setInterval(() => {
    process.exit();
}, 1800000);

module.exports = router;