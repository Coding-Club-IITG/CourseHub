import axios from "./http";
import root from "./server";

export const CreateNewContribution = async (data) => {
    const resp = await axios.post(`${root}/api/contribution/`, data);
    return resp;
};
export const GetMyContributions = async () => {
    const resp = await axios.get(`${root}/api/contribution/`);
    return resp;
};

export const GetBrContribution = async () => {
    const resp = await axios.post(`${root}/api/contribution/br`, {});
    return resp;
}
