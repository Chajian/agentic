import * as fs from 'fs/promises';
import * as path from 'path';

export interface Document {
  title: string;
  content: string;
  category: string;
  path: string;
}

/**
 * Load all documents from a directory
 */
export async function loadDocuments(dirPath: string): Promise<Document[]> {
  const documents: Document[] = [];

  async function walkDir(currentPath: string, category: string = 'general') {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Use directory name as category
        await walkDir(fullPath, entry.name);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        // Only load text-based files
        if (['.md', '.txt', '.json'].includes(ext)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const title = path.basename(entry.name, ext);

          documents.push({
            title,
            content,
            category,
            path: fullPath
          });
        }
      }
    }
  }

  try {
    await walkDir(dirPath);
  } catch (error) {
    console.warn(`Warning: Could not load documents from ${dirPath}:`, error);
  }

  return documents;
}

/**
 * Load a single document
 */
export async function loadDocument(filePath: string, category: string = 'general'): Promise<Document> {
  const content = await fs.readFile(filePath, 'utf-8');
  const ext = path.extname(filePath);
  const title = path.basename(filePath, ext);

  return {
    title,
    content,
    category,
    path: filePath
  };
}
