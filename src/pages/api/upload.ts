import { NextApiRequest, NextApiResponse } from 'next';
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { pipeline } from 'stream/promises';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function uploadFile(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
      allowEmptyFiles: false,
      filter: function ({ mimetype }) {
        // Allow all common image formats
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'image/bmp',
          'image/tiff'
        ];
        return mimetype && allowedMimeTypes.includes(mimetype);
      },
    });

    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Upload error:", err);
          res.status(500).json({ error: 'Upload failed' });
          return resolve(undefined);
        }

        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!file) {
          res.status(400).json({ error: 'No file uploaded' });
          return resolve(undefined);
        }

        try {
          const ext = path.extname(file.originalFilename || '').toLowerCase();
          const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.tif'];
          
          if (!allowedExts.includes(ext)) {
            res.status(400).json({ error: 'Invalid file type. Supported formats: JPG, PNG, GIF, WEBP, SVG, BMP, TIFF' });
            return resolve(undefined);
          }

          const fileName = `nft-img${ext}`;
          const filePath = path.join(uploadsDir, fileName);
          
          // Use streams for file operations
          const readStream = fs.createReadStream(file.filepath);
          const writeStream = fs.createWriteStream(filePath);
          
          try {
            await pipeline(readStream, writeStream);
            // Clean up temp file
            fs.unlinkSync(file.filepath);

            res.status(200).json({ 
              success: true,
              fileName: fileName,
              path: `/uploads/${fileName}`
            });
          } catch (error) {
            console.error("Stream error:", error);
            res.status(500).json({ error: 'File processing failed' });
          }
          
          return resolve(undefined);
        } catch (error) {
          console.error("File processing error:", error);
          res.status(500).json({ error: 'File processing failed' });
          return resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: 'Server error' });
  }
}
