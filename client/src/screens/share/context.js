import { createContext, useContext } from "react";
export const ShareContext = createContext(null);
export const useShare = () => useContext(ShareContext);
