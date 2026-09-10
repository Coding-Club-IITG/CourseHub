import { createContext, useContext } from "react";
export const UploadDialogContext = createContext(null);
export const useUploadDialog = () => useContext(UploadDialogContext);
