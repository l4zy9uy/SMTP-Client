module.exports.ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;
module.exports.ipv6Regex = new RegExp(
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
module.exports.urlRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,6}$/;