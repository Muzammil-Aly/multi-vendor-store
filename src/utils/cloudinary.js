import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // it is used as a file system module to delete the file from the local server after uploading it to cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// cloudinary.uploader
//   .upload("my_image.jpg")
//   .then(result=>console.log(result));

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log("FilePath not found!!");
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "MultivendorImages",
    });
    console.log("File has been uploaded on Cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response; // this will gve the url of the image uploaded on cloudinary
  } catch (err) {
    console.log("Error in uploading on cloudinary", err);
    fs.unlinkSync(localFilePath);
  }
};

export { uploadOnCloudinary };
