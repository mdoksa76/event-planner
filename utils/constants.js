import Gio from 'gi://Gio';

// Event categories with their colors
export const CATEGORIES = {
    WORK: 'work',
    PERSONAL: 'personal',
    FUN: 'fun',
    FAMILY: 'family',
    FRIENDS: 'friends'
};

// Category display names
export const CATEGORY_NAMES = {
    [CATEGORIES.WORK]: 'Work',
    [CATEGORIES.PERSONAL]: 'Personal',
    [CATEGORIES.FUN]: 'Fun',
    [CATEGORIES.FAMILY]: 'Family',
    [CATEGORIES.FRIENDS]: 'Friends'
};

// Category colors (RGB format for GNOME)
export const CATEGORY_COLORS = {
    [CATEGORIES.WORK]: '#3584E4',      // Blue
    [CATEGORIES.PERSONAL]: '#33D17A',   // Green
    [CATEGORIES.FUN]: '#FF7800',        // Orange
    [CATEGORIES.FAMILY]: '#9141AC',     // Purple
    [CATEGORIES.FRIENDS]: '#E01B24'     // Red
};

// Get all category keys
export function getCategoryList() {
    return Object.values(CATEGORIES);
}

// Get category color (works with default and custom categories)
export function getCategoryColor(category, settings = null) {
    // Check default categories first
    if (CATEGORY_COLORS[category]) {
        return CATEGORY_COLORS[category];
    }
    
    // Check custom categories
    if (settings) {
        const customCategories = loadCustomCategories(settings);
        const customCat = customCategories.find(cat => 
            cat.name.toLowerCase().replace(/\s+/g, '-') === category
        );
        if (customCat) {
            return customCat.color;
        }
    }
    
    return '#888888'; // Default gray
}

// Get category display name (works with default and custom categories)
export function getCategoryName(category, settings = null) {
    // Check default categories first
    if (CATEGORY_NAMES[category]) {
        return CATEGORY_NAMES[category];
    }
    
    // Check custom categories
    if (settings) {
        const customCategories = loadCustomCategories(settings);
        const customCat = customCategories.find(cat => 
            cat.name.toLowerCase().replace(/\s+/g, '-') === category
        );
        if (customCat) {
            return customCat.name;
        }
    }
    
    // Return as-is if not found
    return category;
}

// Load custom categories from GSettings
export function loadCustomCategories(settings) {
    try {
        const jsonString = settings.get_string('custom-categories');
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Error loading custom categories:', e);
        return [];
    }
}

// Get all categories (default + custom)
export function getAllCategories(settings) {
    const defaultCategories = getCategoryList().map(id => ({
        id: id,
        name: getCategoryName(id),
        color: getCategoryColor(id),
        isDefault: true
    }));
    
    const customCategories = loadCustomCategories(settings).map(cat => ({
        id: cat.name.toLowerCase().replace(/\s+/g, '-'),  // Generate ID from name
        name: cat.name,
        color: cat.color,
        isDefault: false
    }));
    
    return [...defaultCategories, ...customCategories];
}

// Save custom categories to GSettings
export function saveCustomCategories(settings, categories) {
    try {
        const jsonString = JSON.stringify(categories);
        settings.set_string('custom-categories', jsonString);
        return true;
    } catch (e) {
        console.error('Error saving custom categories:', e);
        return false;
    }
}