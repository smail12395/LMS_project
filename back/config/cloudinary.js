import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
  });

  console.log("✅ Cloudinary connected");
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });

    if (result.result !== "ok") {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }

    console.log(`[${new Date().toISOString()}] 🗑 Cloudinary deleted: ${publicId}`);
    return true;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Cloudinary delete error:`,
      error.message
    );
    return false;
  }
};

export { cloudinary };
export default connectCloudinary;
