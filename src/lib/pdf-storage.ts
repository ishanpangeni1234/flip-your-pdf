// src/lib/pdf-storage.ts

const DB_NAME = "PDFViewerDB";
const STORE_NAME = "pdfStore";
const DB_VERSION = 1;

interface StoredPDF {
  id: string;
  file: File;
  timestamp: Date;
}

// Opens the IndexedDB database.
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(new Error("Failed to open IndexedDB."));
    };
  });
};

// Stores the PDF file in IndexedDB.
export const storePDF = async (file: File): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    // Clear any existing PDF first to only store one at a time.
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
        const pdfToStore: StoredPDF = {
          id: file.name, // Use filename as a simple ID
          file,
          timestamp: new Date(),
        };
        const putRequest = store.put(pdfToStore);
    
        putRequest.onsuccess = () => {
          console.log("✅ PDF stored successfully in IndexedDB.");
          resolve();
        };
    
        putRequest.onerror = () => {
          console.error("Error storing PDF:", putRequest.error);
          reject(new Error("Could not store the PDF file."));
        };
    }

    clearRequest.onerror = () => {
        console.error("Error clearing store:", clearRequest.error);
        reject(new Error("Could not clear the existing PDF file."));
    }
  });
};

// Retrieves the last stored PDF file from IndexedDB.
export const getStoredPDF = async (): Promise<File | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      if (getAllRequest.result.length > 0) {
        // We only store one PDF, so get the first one.
        const stored = getAllRequest.result[0] as StoredPDF;
        console.log("✅ PDF retrieved from IndexedDB:", stored.file.name);
        resolve(stored.file);
      } else {
        console.log("No PDF found in IndexedDB.");
        resolve(null);
      }
    };

    getAllRequest.onerror = () => {
      console.error("Error retrieving PDF:", getAllRequest.error);
      reject(new Error("Could not retrieve PDF file from storage."));
    };
  });
};

// Clears the PDF file from IndexedDB.
export const clearStoredPDF = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log("✅ IndexedDB store cleared.");
      resolve();
    };

    request.onerror = () => {
      console.error("Error clearing IndexedDB store:", request.error);
      reject(new Error("Could not clear PDF from storage."));
    };
  });
};