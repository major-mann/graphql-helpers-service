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
                    fields: Object.keys(sourceFields).reduce(
                        (result, fieldName) => cloneField(result, fieldName, composer),
                        {}
                    )
                });

                for (const [resolverName, resolver] in composer.getResolvers()) {
                    otc.setResolver(resolverName, resolver);
                }
            }
        }
    }

    function cloneField(result, name, composer) {
        const sourceField = composer.getField(name);
        const args = sourceField.args && Object.keys(sourceField.args).reduce((result, argName) => {
            result[argName] = typeName(sourceField.args[argName]);
            return result;
        }, {});
        result[name] = {
            args,
            type: typeName(sourceField.type),
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
