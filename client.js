const net = require('net');
const os = require('os');
const tls = require('tls');

const remoteAddress = process.argv[2];
const receiverEmail = process.argv[3];
const port = process.env.PORT;

if(remoteAddress === null || receiverEmail === null) {
    console.log("You need to pass remote Address and receiver Email");
    process.exit(1);
}

const senderEmail = `hoanghuudon02hp@gmail.com`;
const dataMessage = "This is a test email.";

const messages = [
    `AUTH LOGIN\r\n`,
    `${Buffer.from(process.env.GG_USERNAME).toString('base64')}\r\n`,
    `${Buffer.from(process.env.GG_PASSWORD).toString('base64')}\r\n`,
    `MAIL FROM:<${senderEmail}>\r\n`,
    `RCPT TO:<${receiverEmail}>\r\n`,
    `DATA\r\n`,
    `Subject: Test Email
    \r\nFrom: ${senderEmail}
    \r\nTo: ${receiverEmail}
    \r\n\r\n${dataMessage}
    \r\n.\r\n`,
    `QUIT\r\n`
];

const client = new net.Socket();


client.connect(port, remoteAddress, () => {
    console.log(`connected to ${remoteAddress}:${port}`);
    client.write('EHLO localhost\r\n');
});

client.on('data', (data) => {
    console.log(`Received:\n ${data.toString()}`);

    if (data.toString().includes('250-STARTTLS')) {
        client.write('STARTTLS\r\n');
    } else if (data.toString().includes('220 2.0.0 Ready to start TLS')) {
        // Assume STARTTLS has been issued and server responded with '220 2.0.0 Ready to start TLS'
        const secureContext = tls.createSecureContext({minVersion: 'TLSv1.2'});
        const tlsSocket = new tls.TLSSocket(client, {
            secureContext,
            isServer: false
        });

        tlsSocket.connect({host: remoteAddress, port: port}, () => {
            console.log("Start connect");
            tlsSocket.write('EHLO localhost\r\n');
        });
        if(!tlsSocket.encrypted) {
            console.log("Start TLS encryption");
            tlsSocket.start();
        }
        tlsSocket.on('secureConnect', () => {
            console.log('TLS connection secured');
            tlsSocket.write('EHLO localhost\r\n');
        });

        tlsSocket.on('data', (data) => {
            console.log('Received over TLS:\n', data.toString());
            // Process server responses and send further commands as needed
            if (messages.length > 0) { // Check for completion of EHLO response
                // Now proceed to authenticate or send MAIL FROM, etc.
                const message = messages.shift();
                console.log(`Sending: ${message}`);
                tlsSocket.write(message);
            }
        });

        tlsSocket.on('close', () => {
            console.log('TLS Connection closed');
        });

        tlsSocket.on('error', (err) => {
            console.error('TLS Socket Error:', err);
        });
    }
    else {
        /*if(messages.length !== 0) {
            const message = messages.shift();
            console.log(message);
            client.write(message);
        }*/
    }
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.error(`Connection error: ${err.message}`);
});
