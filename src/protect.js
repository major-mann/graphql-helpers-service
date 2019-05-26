module.exports = {
    sub,
    user,
    admin,
    service,
    protect,
    createMatchCheck
}

function user(resolver, field) {
    field = prepareFieldName(field);
    return protect(resolver, user => {
        if (!user) {
            throw new Error(`${field} only available for authenticated users`);
        }
    });
}

function admin(resolver, field) {
    field = prepareFieldName(field);
    return protect(resolver, user => {
        if (!user || !user.admin) {
            throw new Error(`${field} only available for administrators`);
        }
    });
}

function service(resolver, field) {
    field = prepareFieldName(field);
    return protect(resolver, user => {
        if (!user || !user.service || !user.admin) {
            throw new Error(`${field} only available for authenticated services services (or administrators)`);
        }
    });
}

function sub(resolver, check, field) {
    field = prepareFieldName(field);
    return protect(resolver, async user => {
        const userSub = user && user.sub;
        let valid = false;
        if (userSub) {
            if (typeof check === 'function') {
                valid = await check(userSub);
            } else if (Array.isArray(check)) {
                valid = check.includes(userSub)
            } else {
                valid = check === userSub;
            }
        }
        if (!valid) {
            throw new Error(`user with sub "${userSub}" may not access ${field}`);
        }
    });
}

function protect(resolver, protection, field) {
    field = prepareFieldName(field);
    return resolver.wrapResolve(next => async params => {
        await protection(params.context.user, params.args);
        const result = await next(params);
        return result;
    });
}

function createMatchCheck(match, message) {
    message = message || 'not available for this user';
    return  function matchCheck(resolver, field) {
        field = prepareFieldName(field);
        return protect(resolver, (user, args) => {
            if (!(user && user.admin) && !match(user, args)) {
                throw new Error(`${field} ${message}`);
            }
        });
    }
}

function prepareFieldName(field) {
    if (field) {
        field = `${String(field)} `;
    } else {
        field = '';
    }
    return field;
}
