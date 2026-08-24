const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      const err = new Error("Only JPEG, PNG, and PDF files are allowed");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

module.exports = upload;
