# Firebase Database Structure - letme.study

## Overview
The database stores user data in a simple, organized structure under `/users/{userId}/`.

## Structure

```
/users
  /{userId}                    ← User's unique ID from Google Auth
    /chats
      /{documentId}            ← Document identifier
        - userId: string
        - documentId: string
        - chats: object        ← All chat conversations for this document
        - updatedAt: timestamp
    /notes
      /{documentId}            ← Document identifier  
        - userId: string
        - documentId: string
        - notes: object        ← All note sheets for this document
        - updatedAt: timestamp
```

## What is `documentId`?

The `documentId` identifies which document/context the chats or notes belong to:

### Types of documentId:
1. **`standalone-chat`** - For the global Chat page (`/chat` route)
   - Used when chatting without any PDF open
   - All conversations here are stored under this single ID

2. **`standalone-notes`** - For the global Notes page (`/notes` route)
   - Used when taking notes without any PDF open
   - All note sheets here are stored under this single ID

3. **`{filename}.pdf`** - For PDF-specific chats/notes
   - Example: `physics-chapter-1.pdf`
   - When you open a PDF and use chat/notes, they're tied to that specific PDF
   - Each PDF gets its own separate chat and note storage

## Why This Structure?

### ✅ Benefits:
- **Organized by context**: Chats about Physics PDF stay separate from Math PDF
- **Easy to find**: All data for a specific document is in one place
- **Flexible**: Works for both standalone pages and PDF-specific content
- **Clean**: No mixing of unrelated conversations

### Example Use Cases:

**Scenario 1: Studying Physics**
- Open `physics-chapter-1.pdf`
- Chat with AI about concepts → Stored in `/chats/physics-chapter-1.pdf`
- Take notes → Stored in `/notes/physics-chapter-1.pdf`

**Scenario 2: General Chat**
- Go to `/chat` page (no PDF)
- Chat with AI about anything → Stored in `/chats/standalone-chat`

**Scenario 3: Quick Notes**
- Go to `/notes` page (no PDF)
- Take random notes → Stored in `/notes/standalone-notes`

## Chat History Memory

### How it works now (FIXED):
✅ **Full conversation history is sent to Gemini**

When you send a message, the AI receives:
1. System instructions (how to respond)
2. PDF context (if you selected pages)
3. **All previous messages in the conversation**
4. Your new message

### Format sent to Gemini:
```javascript
[
  { role: 'user', parts: [{ text: 'System instructions...' }] },
  { role: 'model', parts: [{ text: 'Understood.' }] },
  { role: 'user', parts: [{ text: 'What is god?' }] },
  { role: 'model', parts: [{ text: 'God is a complex concept...' }] },
  { role: 'user', parts: [{ text: 'What was my previous question?' }] }
]
```

The AI can now remember and reference earlier parts of your conversation!

## Data Storage Flow

1. **You send a message** → Saved to local state
2. **AI responds** → Response added to local state
3. **After 1 second** (debounced) → Entire conversation synced to Firebase
4. **Next time you open the app** → Conversation loaded from Firebase

This ensures:
- Fast UI updates (no waiting for Firebase)
- Automatic cloud backup
- Works offline (uses local storage as fallback)
