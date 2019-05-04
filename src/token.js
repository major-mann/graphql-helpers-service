module.exports = {
    validator: createValidator,
    generator: createGenerator
};

const jwt = require('jsonwebtoken');

function createValidator({ accepted,
                           issued,
                           resolver,
                           loadIssuerData,
                           acceptedTypeName = 'AcceptedServiceKey',
                           issuedTypeName = 'IssuedServiceKey' }) {
    return function validator(token, context) {
        const decoded = jwt.decode(token, { complete: true });

        let key;
        if (accepted) {
            key = await search(accepted.getOTC(acceptedTypeName));
        }
        if (!key && issued) {
            key = await search(issued.getOTC(issuedTypeName));
        }
        if (!key) {
            throw new Error('key not found in accepted or issued schemas')
        }

        const info = await issuerData();
        let claims = await verify(token, key, info && info.options);
        const mask = info && info.mask;
        if (typeof mask === 'function') {
            claims = await mask(claims);
        }
        return claims;

        function search(type) {
            return resolver(type, 'find', {
                kid: decoded.header.kid || decoded.payload.kid,
                iss: decoded.payload.iss
            });
        }

        async function issuerData() {
            if (typeof loadIssuerData === 'function') {
                const data = await loadIssuerData(decoded.payload.iss, context);
                return data;
            } else {
                return undefined;
            }
        }
    };
}

function createGenerator({ issuer, key, options }) {
    return async function generate(claims) {
        key = await fetchKey(key);
        const now = Math.floor(Date.now() / 1000);
        claims = {
            ...claims,
            iss: issuer,
            iat: now
        };
        const tokenData = await sign(claims, key, options);
        return tokenData;
    };
}

function sign(claims, key, options) {
    return new Promise(function promiseHandler(resolve, reject) {
        jwt.sign(claims, key, options, function onSigned(err, tokenData) {
            if (err) {
                reject(err);
            } else {
                resolve(tokenData);
            }
        });
    });
}

function verify(token, key, options) {
    return new Promise(function promiseHandler(resolve, reject) {
        jwt.verify(token, key, options, function onVerified(err, decoded) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
}

function fetchKey(keyValue) {
    return new Promise(function promiseHandler(resolve, reject) {
        if (typeof keyValue === 'function') {
            keyValue(decoded.header, function onGotKey(err, key) {
                if (err) {
                    reject(err);
                } else if (key) {
                    resolve(key.private || key.public || key);
                } else {
                    resolve();
                }
            });
        } else {
            resolve(keyValue);
        }
    });
}