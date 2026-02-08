import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
  });

  console.log("✅ Cloudinary connected");
};

export const uploadToCloudinary = async (filePath, contentType) => {
  const isPdf = contentType === "pdf";

  const result = await cloudinary.uploader.upload(filePath, {
    folder: "lms_course_content",
    resource_type: isPdf ? "raw" : "auto",
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });

    if (result.result !== "ok") {
      throw new Error(result.result);
    }

    console.log(`🗑 Cloudinary deleted: ${publicId}`);
    return true;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error.message);
    return false;
  }
};

export { cloudinary };
export default connectCloudinary;
