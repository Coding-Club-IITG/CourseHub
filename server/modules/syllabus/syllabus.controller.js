import Syllabus from "./syllabus.model.js";
import dataCE  from "./data/dataCE.js";
import dataFY from "./data/firstYear.js";
import dataBT from "./data/dataBT.js";
import dataCL from "./data/dataCL.js";
import dataCST from "./data/dataCST.js";
import dataCSE from "./data/dataCSE.js";
import dataECE from "./data/dataECE.js";
import dataEEE from "./data/dataEEE.js";
import dataMnC from "./data/dataMnC.js";
import logger from "../../utils/logger.js";


const upload= async (branchData)=>{
    for(let i=0;i<branchData.length;i++){
        try{
            if(branchData[i].code){
            const course=new Syllabus({code:branchData[i].code,courseName:branchData[i].courseName,syllabus:branchData[i].syllabus,year:branchData[i].year});
            await course.save();
            }
        }catch(e){
            logger.error(e);
        }
    }
}

export const uploadSyllabus=async ()=>{
    
    await upload(dataFY);
    await upload(dataCE);
    await upload(dataCSE);
    await upload(dataCST);
    await upload(dataCL);
    await upload(dataBT);
    await upload(dataECE);
    await upload(dataEEE);
    await upload(dataMnC);

}






