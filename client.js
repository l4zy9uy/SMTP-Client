const net = require('net');
const fs = require('fs');
const tls = require('tls');
const Logger = require('./Logger');
const remoteAddress = process.argv[2];
const senderEmail = process.argv[3];
const receiverEmail = process.argv[4];
if (!remoteAddress || !receiverEmail || !senderEmail) {
    console.log("You need to pass " +
        "remote Address, " +
        "sender Email and " +
        "receiver Email");
    process.exit(1);
}
const port = process.env.PORT_GG;
let hasTLS = false;


let messages;
const client = new net.Socket();
const image = fs.readFileSync('cat.jpeg').toString('base64');
fs.readFile('./message', (err, data) => {
    if(err) {
        console.error(err);
        return;
    }
    if(!isValidEmailMessage(data.toString('utf-8'))) {
        console.log("Email is not valid");
        process.exit(1);
    }
    messages = [
        `EHLO localhost\r\n`,
        `MAIL FROM:<${senderEmail}> \r\n`,
        `RCPT TO:<${receiverEmail}>\r\n`,
        `DATA\r\n`,
        `${data}
    \r${image}
    \r\n--boundary_9876--
    \r\n.\r\n`,
        `QUIT\r\n`
    ];

    client.connect(port, remoteAddress,  () => {
        Logger.info(`Connected to ${remoteAddress}:${port}`);
    });
});

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
    if (messages.length > 0) {
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

function isValidEmailMessage(message) {
    const lines = message.split('\n');

    // Check for minimum line requirements
    if (lines.length < 3) {
        console.log("Incomplete message. Ensure From, To, and Subject lines are included.");
        process.exit(1);
    }

    // Destructure the lines array
    const [fromLine, toLine, subjectLine] = lines;

    // Validate each part
    validateLine(fromLine, "From");
    validateLine(toLine, "To");
    validateLine(subjectLine, "Subject", false);

    return true;
}

function validateLine(line, type, checkEmail = true) {
    const parts = line.split(' ');

    if (parts[0] !== `${type}:`) {
        console.log(`Need to include ${type} part.`);
        process.exit(1);
    }

    if (checkEmail && !isValidEmail(parts[1])) {
        console.log(`The ${type.toLowerCase()} email is invalid.`);
        process.exit(1);
    }
}

function isValidEmail(email) {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
}
