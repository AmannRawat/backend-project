import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //Upload File on Cloudinary
        const response = await cloudinary.uploader
            .upload(localFilePath, {
                resource_type: "auto"
            }
            )
        //File uploaded succesfully 
        console.log("File is Uploaded On Cloudinary", response.url);
        return response;
    } catch (err) {
        fs.unlinkSyncw(localFilePath)//rEMOVES THE LOCALLY SAVED TREMPORARY FILE AS the upload operation got failed
        console.log(err);
        return null;
    }
}