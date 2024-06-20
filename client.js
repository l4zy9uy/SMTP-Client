const net = require('net');
const fs = require('fs');
const tls = require('tls');

const remoteAddress = process.argv[2];
const senderEmail = process.argv[3];
const receiverEmail = process.argv[4];
const subject = "Test Email";
const port = process.env.PORT_MAILHOG;

if (remoteAddress === null || receiverEmail === null || senderEmail === null) {
    console.log("You need to pass remote Address, sender Email and receiver" +
        " Email");
    process.exit(1);
}

let dataMessage;
let messages;
const client = new net.Socket();

fs.readFile('./message', (err, data) => {
    dataMessage = data.toString('utf-8');
    messages = [
        `EHLO localhost\r\n`,
        `MAIL FROM:<${senderEmail}>\r\n`,
        `RCPT TO:<${receiverEmail}>\r\n`,
        `DATA\r\n`,
        `Subject: ${subject}
    \r\nFrom: ${senderEmail}
    \r\nTo: ${receiverEmail}
    \r\n\r\n${dataMessage}
    \r\n.\r\n`,
        `QUIT\r\n`
    ];

    client.connect(port, remoteAddress, () => {
        console.log(`Connected to ${remoteAddress}:${port}`);
        //client.write('EHLO localhost\r\n');
    });
})
let hasTLS = false;
client.on('data', (data) => {
    console.log(`Received:\n${data.toString()}`);

    if (data.toString().includes('250-STARTTLS')) {
        hasTLS = true;
        client.write('STARTTLS\r\n');
    } else if (data.toString().includes('220 2.0.0 Ready to start TLS')) {
        upgradeToTLS(client);
    } else if (hasTLS === false) {
        handleServerResponse(client, data.toString());
    }
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.error(`Connection error: ${err.message}`);
});

function handleServerResponse(socket, response) {
    if (messages.length > 0) { // Check for completion of EHLO response
        // Now proceed to authenticate or send MAIL FROM, etc.
        const message = messages.shift();
        console.log(`Sending: ${message}`);
        socket.write(message);
    }
}

function upgradeToTLS(socket) {
    const secureContext = tls.createSecureContext({minVersion: 'TLSv1.2'});
    const tlsSocket = new tls.TLSSocket(socket, {
        secureContext,
        isServer: false
    });

    tlsSocket.connect({host: remoteAddress, port: port}, () => {
        console.log("Start connect");
        tlsSocket.write('EHLO localhost\r\n');
        messages.unshift(`AUTH LOGIN\r\n`,
            `${Buffer.from(process.env.GG_USERNAME).toString('base64')}\r\n`,
            `${Buffer.from(process.env.GG_PASSWORD).toString('base64')}\r\n`);
    });
    if (!tlsSocket.encrypted) {
        console.log("Start TLS encryption");
        tlsSocket.start();
    }
    tlsSocket.once('secureConnect', () => {
        console.log('TLS connection secured');
        tlsSocket.write('EHLO localhost\r\n');
    });

    tlsSocket.on('data', (tlsData) => {
        console.log('Received over TLS:\n', tlsData.toString());
        handleServerResponse(tlsSocket, tlsData.toString());
    });
    tlsSocket.on('close', () => {
        console.log('TLS Connection closed');
    });

    tlsSocket.on('error', (err) => {
        console.error('TLS Socket Error:', err);
    });
}