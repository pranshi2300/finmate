const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");
const https = require("https");
const { URL } = require("url");

function ensureConfig() {
  const missing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((key) => !process.env[key]);

  if (missing.length) {
    const error = new Error(
      `Cloudinary configuration missing: ${missing.join(", ")}`
    );
    error.status = 500;
    throw error;
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function streamUpload(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const readable = Readable.from([buffer]);
    readable.pipe(uploadStream);
  });
}

async function uploadReceiptImage(buffer, publicId) {
  ensureConfig();
  return streamUpload(buffer, {
    folder: "finmate/receipts",
    public_id: publicId,
    resource_type: "auto",
    overwrite: false,
  });
}

async function getDerivedImageBuffer(publicId) {
  ensureConfig();

  const url = cloudinary.url(publicId, {
    resource_type: "image",
    format: "jpg",
    page: 1,
    secure: true,
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    https.get(parsedUrl, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download transformed image: ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function deleteResource(publicId) {
  ensureConfig();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: "auto" }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

module.exports = { uploadReceiptImage, getDerivedImageBuffer, deleteResource };
