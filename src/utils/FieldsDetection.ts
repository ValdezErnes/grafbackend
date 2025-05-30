export const isUsernameField = (fieldName: string): boolean => {
    const usernameVariations = [
        'username', 'user', 'usuario', 'nom_usuario', 'nombre_usuario', 
        'nomusuario', 'user_name', 'nick', 'nickname', 'alias', 'cuenta', 'account'
    ];
    const lowerFieldName = fieldName.toLowerCase().replace(/[_\s]/g, '');
    
    return usernameVariations.some(variation => {
        const normalizedVariation = variation.replace(/[_\s]/g, '');
        // Solo coincidencia exacta o si el campo contiene la variación completa
        return lowerFieldName === normalizedVariation || 
               lowerFieldName.includes(normalizedVariation);
    });
};

export const isPasswordField = (fieldName: string): boolean => {
    const passwordVariations = [
        'password', 'pass', 'contra', 'contrasena', 'contraseña',
        'clave', 'key', 'pwd', 'passwd'
    ];
    const lowerFieldName = fieldName.toLowerCase().replace(/[_\s]/g, '');
    
    return passwordVariations.some(variation => {
        const normalizedVariation = variation.replace(/[_\s]/g, '');
        // Solo coincidencia exacta o si el campo contiene la variación completa
        return lowerFieldName === normalizedVariation || 
               lowerFieldName.includes(normalizedVariation);
    });
};

export const isUserClass = (className: string): boolean => {
    const userClassNames = ['user', 'users', 'usuario', 'usuarios'];
    return userClassNames.some(userClassName => 
        className && className.toLowerCase().includes(userClassName.toLowerCase())
    );
};

export const findUsernameField = (properties: any[]): any => {
    return properties.find((prop: any) => isUsernameField(prop.name));
};

export const findPasswordField = (properties: any[]): any => {
    return properties.find((prop: any) => isPasswordField(prop.name));
};
