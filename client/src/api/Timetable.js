import axios from 'axios';
import serverRoot from './server';

const API = axios.create({
    baseURL: `${serverRoot}/api/examslots`,
    withCredentials: true,
});

export const fetchExamSlot = async (course, branch, semester) => {
    const { data } = await API.get(`/${course}/${branch}/${semester}`);
    return data;
}

export const createOrUpdateExamSlot = async (examSlotData) => {
    const { data } = await API.post('/update', examSlotData);
    return data;
}