import axios from "axios";
axios.defaults.withCredentials = true;
import root from "./server";

export const CreateNewContribution = async (data) => {
    const resp = await axios.post(`${root}/api/contribution/`, data);
    return resp;
};
export const GetMyContributions = async () => {
    const resp = await axios.get(`${root}/api/contribution/`);
    return resp;
};

export const GetBrContribution = async (courses) => {
    const resp = await axios.post(`${root}/api/contribution/br`, { courses });
    return resp;
}
