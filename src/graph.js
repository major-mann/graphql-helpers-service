module.exports = function createInternalGraphInteractor({ createSource = createEmptyObject,
                                                          createContext = createEmptyObject,
                                                          createInfo = createEmptyObject }) {

    return async function resolve(type, fieldName, args, source, context, info) {
        const field = typeof type.getField === 'function' ?
            type.getField(fieldName) :
            type.getFields()[fieldName];

        if (!field) {
            throw new Error(`No field named "${fieldName}" found`);
        }
        if (source === undefined) {
            source = createSource(type, fieldName, args);
        }
        if (context === undefined) {
            context = createContext(type, fieldName, args);
        }
        if (info === undefined) {
            info = createInfo(type, fieldName, args);
        }
        const result = await field.resolve(source, args, context, info);
        return result;
    };

    function createEmptyObject() {
        return {};
    }
}