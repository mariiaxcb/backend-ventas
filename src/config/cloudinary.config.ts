import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import { env } from './env.config'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tiktok-live-sales/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  } as any,
})

const receiptStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tiktok-live-sales/receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  } as any,
})

export const uploadProductImage = multer({ storage: productStorage })
export const uploadReceiptImage = multer({ storage: receiptStorage })
export { cloudinary }
