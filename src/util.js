module.exports = { merge };

const { ObjectTypeComposer, Resolver } = require('graphql-compose');

function merge(destination, source, handleConflict) {
    for (const [name, composer] of source.entries()) {
        if (composer instanceof ObjectTypeComposer) {
            const conflict = destination.has(name);

            let finalSource = conflict ?
                composer :
                composer;

            if (finalSource === undefined) {
                finalSource = composer;
            } else if (finalSource === true) {
                // TODO: merge fields
            } else if (finalSource) {
                // Remove existing and replace....
                //  But... then we need replace all references!
            }

            const sourceFields = finalSource.getFields();

            const otc = destination.createObjectTC({
                name,
                fields: Object.keys(sourceFields).reduce(
                    (result, fieldName) => cloneField(result, fieldName, finalSource),
                    {}
                )
            });

            // TODO: Directives?
            otc.setDescription(finalSource.getDescription());
            finalSource.getInterfaces().map(typeName).forEach(name => otc.addInterface(name));
            otc.setExtensions(finalSource.getExtensions());
            for (const [resolverName, resolver] in finalSource.getResolvers()) {
                otc.setResolver(resolverName, cloneResolver(resolver));
            }
        }
    }

    function cloneField(result, name, composer) {
        const sourceField = composer.getField(name);
        if (sourceField.type instanceof Resolver) {
            // TODO: Do we want to clone? Or try lookup somehow?
            result[name] = cloneResolver(sourceField.type);
        } else {
            result[name] = {
                type: typeName(sourceField.type),
                resolve: sourceField.resolve,
                subscribe: sourceField.subscribe,
                deprecationReason: sourceField.deprecationReason,
                description: sourceField.description,
                extensions: sourceField.extensions,
                args: cloneArgs(sourceField.args)
            };
        }
        return result;
    }

    function cloneResolver(resolver) {
        resolver = resolver.clone();

        // Make sure types  are strings
        resolver.setType(typeName(resolver.type));
        resolver.getArgNames().forEach(name => setArgType(resolver, name, typeName(resolver.getArg(name).type)));

        return resolver;
    }

    function setArgType(resolver, name, type) {
        resolver.extendArg(name, { type });
    }

    function cloneArgs(args) {
        if (args) {
            return Object.keys(args).reduce((result, argName) => {
                result[argName] = typeName(args[argName]);
                return result;
            }, {})
        } else {
            return args;
        }
    }

    function typeName(type) {
        if (typeof type === 'string') {
            return type;
        } else {
            return type.getTypeName();
        }
    }
}
