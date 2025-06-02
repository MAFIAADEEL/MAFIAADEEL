const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function MAFIA_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                syncFullHistory: false,
                browser: Browsers.macOS("Safari")
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);
            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                
                if (connection == "open") {
                    await delay(5000);
                    let rf = __dirname + `/temp/${id}/creds.json`;
                    
                    try {
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let sessionId = "MAFIA-MD~" + string_session;
                        
                        // First send the session ID and store the message object
                        const sessionMsg = await sock.sendMessage(sock.user.id, { 
                            text: sessionId
                        });
                        
                        // Send warning as a reply to the session message
                        await sock.sendMessage(sock.user.id, { 
                            text: "⚠️ DO NOT SHARE THIS SESSION ID WITH ANYONE",
                            quoted: sessionMsg
                        });

                        await sock.ws.close();
                        await removeFile('./temp/' + id);
                        process.exit();
                    } catch (e) {
                        const errorMsg = await sock.sendMessage(sock.user.id, { 
                            text: `Error: ${e}`
                        });
                        await sock.sendMessage(sock.user.id, { 
                            text: "⚠️ This error contains sensitive information - do not share",
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
    return await MAFIA_MD_PAIR_CODE();
});

module.exports = router;