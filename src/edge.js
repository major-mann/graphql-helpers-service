module.exports = {
    cache,
    document,
    edgeExtend,
    protectField,
    protectResolver
};

function edgeExtend(type, name, extensions) {
    if (typeof name === 'object') {
        Object.keys(name).forEach(field => edgeExtend(type, field, name[field]));
        return;
    }

    if (extensions.document) {
        document(type, name, extensions.document);
    }
    if (extensions.cache) {
        cache(type, name, extensions.cache);
    }
    if (extensions.protect) {
        protectField(type, name, extensions.protect);
    }
}

function document(type, name, description) {
    if (name) {
        type.extendField(name, { description });
    } else {
        type.setDescription(description);
    }
}

function cache(type, name, { maxAge, scope }) {
    if (name) {
        type.setFieldExtension(name, 'cacheControl', {
            version: 1,
            maxAge,
            scope
        });
    } else {
        type.setExtension('cacheControl', {
            version: 1,
            maxAge,
            scope
        });
    }

}

function protectField(type, name, protection) {
    const resolverName = `$${name}`;
    protectResolver(type, resolverName, protection);
    type.setField(name, type.getResolver(resolverName));
}

function protectResolver(type, name, protection) {
    const resolver = type.getResolver(name);
    const protectedResolver = resolver.wrapResolve(next => async params => {
        await protection(params.context.user);
        const result = await next(params);
        return result;
    });
    type.setResolver(name, protectedResolver);
}
