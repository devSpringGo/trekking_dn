/**
 * Service to interact with Google Drive API
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

/**
 * Extracts the folder ID from a Google Drive folder URL
 * @param input The URL or folder ID
 * @returns The extracted folder ID
 */
export const extractFolderId = (input: string): string => {
  const folderRegex = /folders\/([a-zA-Z0-9_-]+)/;
  const match = input.match(folderRegex);
  return match ? match[1] : input.trim();
};

/**
 * Fetches all image files from a public Google Drive folder
 * @param folderId The ID of the Google Drive folder
 * @param apiKey Your Google Drive API Key
 * @returns Array of direct image URLs
 */
export const fetchDriveFolderImages = async (folderId: string, apiKey: string): Promise<{id: string, url: string, name: string, metadata?: any, size?: string, createdTime?: string}[]> => {
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình VITE_GOOGLE_DRIVE_API_KEY trong Settings.");
  }

  // Query: files in this folder AND is an image
  const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${apiKey}&fields=files(id,name,mimeType,imageMediaMetadata,size,createdTime)`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Không thể truy cập thư mục Drive. Hãy kiểm tra ID và quyền chia sẻ.");
    }

    if (!data.files || data.files.length === 0) {
      return [];
    }

    return data.files.map((file: any) => ({
      id: file.id,
      name: file.name,
      // Direct link format for Google Drive images
      url: `https://drive.google.com/uc?export=view&id=${file.id}`,
      metadata: file.imageMediaMetadata,
      size: file.size,
      createdTime: file.createdTime
    }));
  } catch (error) {
    console.error("Drive API Error:", error);
    throw error;
  }
};
