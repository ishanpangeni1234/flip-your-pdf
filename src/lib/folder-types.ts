// src/lib/folder-types.ts

export interface FolderStructure {
    folders: { [folderId: string]: Folder };
    itemFolderMap: { [itemName: string]: string }; // Maps item name to folder ID, undefined means unorganized
}

export interface Folder {
    id: string;
    name: string;
    createdAt: number;
}

export const createNewFolder = (name: string): Folder => {
    return {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: Date.now(),
    };
};

export const getItemsInFolder = (
    folderId: string | null,
    allItems: string[],
    itemFolderMap: { [itemName: string]: string }
): string[] => {
    return allItems.filter(itemName => {
        const itemFolder = itemFolderMap[itemName];
        if (folderId === null) {
            // Return unorganized items (not in any folder)
            return !itemFolder;
        }
        return itemFolder === folderId;
    });
};

export const moveItemToFolder = (
    itemName: string,
    targetFolderId: string | null,
    itemFolderMap: { [itemName: string]: string }
): { [itemName: string]: string } => {
    const newMap = { ...itemFolderMap };
    if (targetFolderId === null) {
        // Move to unorganized
        delete newMap[itemName];
    } else {
        newMap[itemName] = targetFolderId;
    }
    return newMap;
};
