const net = require('net');
const dns = require('dns');
const os = require('os');
const tls = require('tls');
const { promisify } = require('util');

const remoteAddress = process.argv[2];
const port = 587; // you can customize this directly or pass argument
const receiverEmail = process.argv[3];

// Regular expressions for IP address and URL validation
const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
const ipv6Regex = new RegExp(
    '^(' +
    // Full eight-group address
    '([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|' +
    // Seven groups and an ending colon
    // (implies one zero-compressed group at the end)
    '([0-9a-fA-F]{1,4}:){1,7}:|' +
    // One to six groups followed by one group and an ending colon
    // (one zero-compressed group somewhere in the middle to end)
    '([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|' +
    // One to five groups, followed by two groups
    // (zero-compressed groups somewhere in the middle)
    '([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|' +
    // One to four groups, followed by three groups
    '([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|' +
    // One to three groups, followed by four groups
    '([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|' +
    // One to two groups, followed by five groups
    '([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|' +
    // One group, followed by six groups
    '[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|' +
    // No groups, followed by seven groups or just a colon
    // (all zero-compressed address)
    ':((:[0-9a-fA-F]{1,4}){1,7}|:)|' +
    // Link-local address with zone index
    'fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|' +
    // IPv4-mapped IPv6 address
    '::(ffff(:0{1,4}){0,1}:){0,1}' +
    '((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\\.){3,3}' +
    '(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])|' +
    // IPv6 address with an embedded IPv4 address
    '([0-9a-fA-F]{1,4}:){1,4}:' +
    '((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\\.){3,3}' +
    '(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])' +
    ')$', 'i'
);
const urlRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,6}$/;

if(remoteAddress === null) {
    console.log("You need to pass remoteAddress");
    process.exit(1);
}
if(receiverEmail === null) {
    console.log("You need to pass receiver Email");
    process.exit(1);
}

const localIPAddress = getLocalIpAddress();
const senderEmail = `hoanghuudon02hp@gmail.com`;
const dataMessage = "This is a test email.";
const messages = [
    `AUTH LOGIN\r\n`,
    `${process.env.GG_USERNAME}\r\n`,
    `${process.env.GG_PASSWORD}\r\n`,
    `MAIL FROM:<${senderEmail}>\r\n`,
    `RCPT TO:<${receiverEmail}>\r\n`,
    `DATA\r\n`,
    `Subject: Test Email\r\nFrom: ${senderEmail}\r\nTo: ${receiverEmail}\r\n\r\n${dataMessage}\r\n.\r\n`,
    `QUIT\r\n`
];

const client = new net.Socket();

if (ipv4Regex.test(remoteAddress)) {
    console.log(`${remoteAddress} is an IPv4 remoteAddress.`);
} else if (ipv6Regex.test(remoteAddress)) {
    console.log(`${remoteAddress} is an IPv6 remoteAddress.`);
} else if (urlRegex.test(remoteAddress)) {
    console.log(`${remoteAddress} is a URL.`);
    dns.resolve4(remoteAddress,
        (err, remoteAddresses) => {
        if (err) {
            console.error(`Error resolving URL: ${err}`);
        } else {
            console.log(`IP remoteAddresses for 
            ${remoteAddress}: ${remoteAddresses}`);
        }
    });
} else {
    console.log(`${remoteAddress} 
    is neither a valid IP remoteAddress nor a URL.`);
}


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
                //console.log("Start sending");
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

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        for (const addressInfo of addresses) {
            if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
                //console.log(`Local IP address: ${addressInfo.address}`);
                return addressInfo.address;
            }
        }
    }
    console.log('No external IPv4 address found');
}