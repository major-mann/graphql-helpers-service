module.exports = { merge };

const { ObjectTypeComposer } = require('graphql-compose');

function merge(destination, source) {
    for (const [name, composer] of source.entries()) {
        if (composer instanceof ObjectTypeComposer) {
            if (!destination.has(name)) {
                const sourceFields = composer.getFields();

                const otc = destination.createObjectTC({
                    name,
                    interfaces: composer.getInterfaces().map(typeName),
                    extensions: composer.getExtensions(),
                    description: composer.getDescription(),
                    fields: Object.keys(sourceFields).reduce(cloneField, {})
                });

                for (const [resolverName, resolver] in composer.getResolvers()) {
                    otc.setResolver(resolverName, resolver);
                }
            }
        }
    }

    function cloneField(result, name) {
        const sourceField = composer.getField(name);
        result[name] = {
            type: typeName(sourceField.type),
            args: Object.keys(sourceField.args).reduce((result, argName) => {
                result[argName] = typeName(sourceField.args[argName]);
                return result;
            }, {}),
            resolve: sourceField.resolve,
            subscribe: sourceField.subscribe,
            deprecationReason: sourceField.deprecationReason,
            description: sourceField.description,
            extensions: sourceField.extensions
        };
        return result;
    }

    function typeName(type) {
        if (typeof type === 'string') {
            return type;
        } else {
            return type.getTypeName();
        }
    }
}
