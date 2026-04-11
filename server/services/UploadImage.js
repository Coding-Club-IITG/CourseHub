import ImageKit from "imagekit";
import ImageUploadCreds from "../config/ImageUpload.js";
import logger from "../utils/logger.js";

var imagekit = new ImageKit({
    ...ImageUploadCreds,
});

export const UploadImage = async (url, name, folder) => {
    try {
        const resp = await imagekit.upload({
            file: url,
            fileName: name + ".jpg",
            folder: `/${folder}`,
        });
        return resp;
    } catch (error) {
        return false;
    }
};

export async function MakeImagekitFolder(foldername) {
    imagekit.deleteFolder(`/${foldername}`, function (error, result) {
        if (error) logger.error("error deleting");
        else logger.info("deleted folder", foldername);
    });
    try {
        imagekit.createFolder({
            folderName: foldername,
            parentFolderPath: "/",
        });
    } catch (error) {
        return false;
    }
    return true;
}
