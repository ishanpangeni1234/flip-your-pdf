// src/components/common/FolderSidebar.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Trash2,
    Pencil,
    ChevronDown,
    ChevronRight,
    MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Folder as FolderType } from '@/lib/folder-types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderSidebarProps {
    folders: { [folderId: string]: FolderType };
    itemFolderMap: { [itemName: string]: string };
    allItems: string[];
    activeItem: string | null;
    onCreateFolder: () => void;
    onRenameFolder: (folderId: string, newName: string) => boolean;
    onDeleteFolder: (folderId: string) => void;
    onSelectItem: (itemName: string) => void;
    onMoveItem: (itemName: string, targetFolderId: string | null) => void;
    onRenameItem: (itemName: string, newName: string) => boolean;
    onDeleteItem: (itemName: string) => void;
    createNewItemLabel: string;
    onCreateNewItem: () => void;
    isRenamingItem: string | null;
    setIsRenamingItem: (itemName: string | null) => void;
}

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
    folders,
    itemFolderMap,
    allItems,
    activeItem,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onSelectItem,
    onMoveItem,
    onRenameItem,
    onDeleteItem,
    createNewItemLabel,
    onCreateNewItem,
    isRenamingItem,
    setIsRenamingItem,
}) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
    const [folderInputValue, setFolderInputValue] = useState('');
    const [itemInputValue, setItemInputValue] = useState('');
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

    const folderInputRef = useRef<HTMLInputElement>(null);
    const itemInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (renamingFolder) folderInputRef.current?.focus();
    }, [renamingFolder]);

    useEffect(() => {
        if (isRenamingItem) itemInputRef.current?.focus();
    }, [isRenamingItem]);

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const handleFinishFolderRename = () => {
        if (renamingFolder) {
            const success = onRenameFolder(renamingFolder, folderInputValue);
            if (success) {
                setRenamingFolder(null);
                setFolderInputValue('');
            }
        }
    };

    const handleFinishItemRename = () => {
        if (isRenamingItem) {
            const success = onRenameItem(isRenamingItem, itemInputValue);
            if (success) {
                setIsRenamingItem(null);
                setItemInputValue('');
            }
        }
    };

    const handleFolderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleFinishFolderRename();
        if (e.key === 'Escape') {
            setRenamingFolder(null);
            setFolderInputValue('');
        }
    };

    const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleFinishItemRename();
        if (e.key === 'Escape') {
            setIsRenamingItem(null);
            setItemInputValue('');
        }
    };

    const startFolderRename = (folderId: string, currentName: string) => {
        setRenamingFolder(folderId);
        setFolderInputValue(currentName);
    };

    const startItemRename = (itemName: string) => {
        setIsRenamingItem(itemName);
        setItemInputValue(itemName);
    };

    const handleDragStart = (e: React.DragEvent, itemName: string) => {
        setDraggedItem(itemName);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverFolder(null);
    };

    const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverFolder(folderId);
    };

    const handleDragLeave = () => {
        setDragOverFolder(null);
    };

    const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        if (draggedItem) {
            onMoveItem(draggedItem, targetFolderId);
        }
        setDraggedItem(null);
        setDragOverFolder(null);
    };

    const getItemsInFolder = (folderId: string | null): string[] => {
        return allItems.filter(itemName => {
            const itemFolderId = itemFolderMap[itemName];

            // If we are looking for unorganized items (folderId === null)
            if (folderId === null) {
                // Return true if:
                // 1. It has no folder mapping
                // 2. OR the folder it maps to doesn't exist in the folders object
                return !itemFolderId || !folders[itemFolderId];
            }

            // If we are looking for items in a specific folder
            return itemFolderId === folderId;
        });
    };

    const renderItem = (itemName: string) => {
        if (isRenamingItem === itemName) {
            return (
                <div key={`renaming-${itemName}`} className="p-1 pl-2">
                    <Input
                        ref={itemInputRef}
                        value={itemInputValue}
                        onChange={e => setItemInputValue(e.target.value)}
                        onKeyDown={handleItemKeyDown}
                        onBlur={handleFinishItemRename}
                        className="h-9"
                    />
                </div>
            );
        }

        return (
            <div
                key={itemName}
                draggable
                onDragStart={(e) => handleDragStart(e, itemName)}
                onDragEnd={handleDragEnd}
                className={cn(
                    "pl-2 cursor-move",
                    draggedItem === itemName && "opacity-50"
                )}
            >
                <Button
                    variant={activeItem === itemName ? "secondary" : "ghost"}
                    onClick={() => onSelectItem(itemName)}
                    className="w-full justify-start truncate h-9 group pr-0 pl-1"
                >
                    <span className="truncate flex-1 text-left">{itemName}</span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    startItemRename(itemName);
                                }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    <span>Rename</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteItem(itemName);
                                    }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </Button>
            </div>
        );
    };

    const renderFolder = (folderId: string, folder: FolderType) => {
        const isExpanded = expandedFolders.has(folderId);
        const itemsInFolder = getItemsInFolder(folderId);
        const isDragOver = dragOverFolder === folderId;

        if (renamingFolder === folderId) {
            return (
                <div key={`renaming-folder-${folderId}`} className="p-1">
                    <Input
                        ref={folderInputRef}
                        value={folderInputValue}
                        onChange={e => setFolderInputValue(e.target.value)}
                        onKeyDown={handleFolderKeyDown}
                        onBlur={handleFinishFolderRename}
                        className="h-9"
                    />
                </div>
            );
        }

        return (
            <div key={folderId}>
                <div
                    onDragOver={(e) => handleDragOver(e, folderId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folderId)}
                    className={cn(
                        "rounded-md transition-colors",
                        isDragOver && "bg-primary/10 ring-2 ring-primary/50"
                    )}
                >
                    <Button
                        variant="ghost"
                        onClick={() => toggleFolder(folderId)}
                        className="w-full justify-start h-9 group pr-0 pl-0"
                    >
                        {isExpanded ? (
                            <ChevronDown className="mr-1 h-4 w-4 flex-shrink-0" />
                        ) : (
                            <ChevronRight className="mr-1 h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1 text-left">{folder.name}</span>
                        <span className="text-xs text-muted-foreground mr-1">
                            {itemsInFolder.length}
                        </span>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        startFolderRename(folderId, folder.name);
                                    }}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        <span>Rename</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteFolder(folderId);
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </Button>
                </div>
                {isExpanded && (
                    <div className="mt-1">
                        {itemsInFolder.map(itemName => renderItem(itemName))}
                    </div>
                )}
            </div>
        );
    };


    const unorganizedItems = getItemsInFolder(null);

    return (
        <div className="flex-1 overflow-y-auto p-2">
            <Button
                onClick={onCreateNewItem}
                className="w-full justify-start mb-2"
                disabled={!!isRenamingItem || !!renamingFolder}
            >
                {createNewItemLabel}
            </Button>

            <Button
                onClick={onCreateFolder}
                variant="outline"
                className="w-full justify-start mb-2"
                disabled={!!isRenamingItem || !!renamingFolder}
            >
                Create Folder
            </Button>

            <div className="my-2 h-px bg-border" />

            {/* Folders */}
            <div className="flex flex-col gap-1">
                {Object.entries(folders)
                    .sort(([, a], [, b]) => a.createdAt - b.createdAt)
                    .map(([folderId, folder]) => renderFolder(folderId, folder))}
            </div>

            {/* Unorganized Items */}
            {unorganizedItems.length > 0 && (
                <>
                    <div className="my-2 h-px bg-border" />
                    <div
                        onDragOver={(e) => handleDragOver(e, null)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, null)}
                        className={cn(
                            "rounded-md p-1 transition-colors",
                            dragOverFolder === null && draggedItem && "bg-primary/10 ring-2 ring-primary/50"
                        )}
                    >
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1 ml-2">
                            Unorganized
                        </h4>
                        <div className="flex flex-col gap-1">
                            {unorganizedItems.map(itemName => renderItem(itemName))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
