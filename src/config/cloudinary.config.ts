import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import { env } from './env.config'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

const createStorage = (folderName: string) => {
  return new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder: `tiktok-live-sales/${folderName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    }),
  })
}

export const uploadProductImage = multer({
  storage: createStorage('products'),
  limits: { fileSize: 5 * 1024 * 1024 },
})

export const uploadReceiptImage = multer({
  storage: createStorage('receipts'),
  limits: { fileSize: 10 * 1024 * 1024 },
})

export { cloudinary }
