export const STORAGE_KEYS = {
    PREFERENCE: '@preference'
};

export const getPreference = (endpoint: string): string => {
    return (`${STORAGE_KEYS.PREFERENCE}:${endpoint}`)
}