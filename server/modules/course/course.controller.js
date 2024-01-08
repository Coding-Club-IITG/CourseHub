import AppError from "../../utils/appError.js";
import CourseModel, { FolderModel, FileModel } from "./course.model.js";
import logger from "../../utils/logger.js";
import SearchResults from "../search/search.model.js";
export const getCourse = async (req, res, next) => {
    const { code } = req.params;
    logger.info(`GET /course/${code}`);

    if (!code) throw new AppError(400, "Missing Course Id");
    const course = await CourseModel.findOne({ code: code.toLowerCase() })
        .populate({
            path: "children",
            select: "-__v",
            populate: {
                path: "children",
                select: "-__v",
                populate: {
                    strictPopulate: false,
                    path: "children",
                    select: "-__v",
                    populate: {
                        strictPopulate: false,
                        path: "children",
                        select: "-__v",
                        populate: {
                            strictPopulate: false,
                            path: "children",
                            select: "-__v",
                            populate: {
                                strictPopulate: false,
                                path: "children",
                                select: "-__v",
                                populate: {
                                    strictPopulate: false,
                                    path: "children",
                                    select: "-__v",
                                    populate: {
                                        strictPopulate: false,
                                        path: "children",
                                        select: "-__v",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
        .select("-__v");

    // if (!course) throw new AppError(404, "Coming Soon!");
    if (!course) return res.json({ found: false });
    return res.json({ found: true, ...course["_doc"] });
};

export const deleteCourseByCode = async (req, res, next) => {
    const { code } = req.params;
    if (!code) throw new AppError(400, "Missing Course Id");
    const search = await SearchResults.findOne({ code: code.toLowerCase() });
    await FolderModel.deleteMany({ course: code.toLowerCase() });
    await FileModel.deleteMany({
        course: `${code.toLowerCase()} - ${search.modelName.toLowerCase()}`,
    });
    await CourseModel.deleteOne({ code: code.toLowerCase() });
    res.sendStatus(200);
};

// update course
// delete existing course -> fetch new structure from onedrive

export const getAllCourses = async (req, res, next) => {
    const allCourse = await CourseModel.find().select("_id name code");

    res.json(allCourse);
};

export const isCourseUpdated = async (req, res, next) => {
    let { clientOn } = req.body;
    if (!clientOn) return next(new AppError(500, "Invalid data provided!"));
    let outdatedOnClient = [];

    let courses = req.user.courses.map((c) => c.code.toLowerCase());
    const searchResults = await SearchResults.find({ code: courses });
    let availableCourses = searchResults.filter((s) => s.isAvailable === true);
    let availableCourseCodes = availableCourses.map((c) => c.code.toLowerCase());
    let allOutdatedCourses = await CourseModel.find({
        $and: [
            { code: availableCourseCodes },
            { $or: [{ createdAt: { $gt: clientOn } }, { updatedAt: { $gt: clientOn } }] },
        ],
    });

    allOutdatedCourses.map((course) => {
        outdatedOnClient.push(course.code);
    });

    if (!allOutdatedCourses.length > 0) {
        return res.json({ updated: false, subscribedCourses: req.user.courses });
    }
    return res.json({
        updated: true,
        updatedCourses: outdatedOnClient,
        subscribedCourses: req.user.courses,
    });
};


export const allChangeDetails=async (req,res,next)=>{
    const {courses,favourites,time}=req.body;

    if(!courses || !favourites) return res.sendStatus(400);
    
    const currentCourses=req.user.courses;
    const currentFavourites=req.user.favourites;

    const updatedCourse=[],subtractedCourse=[];
    let isFavouriteUpdated=false,isCourseAdded=false,isCourseChanged=false,isCourseSubtracted=false;
    let sortedCourses=courses.sort((a,b)=>a.code-b.code);
    let sortedCurrentCourses=currentCourses.sort((a,b)=>a.code-b.code);

    // checking courses

    for(let i=0;i<currentCourses.length;i++){
        if(currentCourses[i].updatedAt>time){
            let code=currentCourses[i].code;
            const courseData = await CourseModel.findOne({ code: currentCourses[i].code.toLowerCase() }).select('-__v -updatedAt -createdAt -_id')
            updatedCourse.push({[code]:{course:currentCourses[i],courseData}});
            isCourseChanged=true;
        }
    }

    if(currentCourses.length===courses.length){
        
        for(let i=0;i<courses.length;i++){
            if(sortedCurrentCourses[i].code!=sortedCourses[i].code){
                let code=currentCourses[i].code;
                const courseData = await CourseModel.findOne({ code: currentCourses[i].code.toLowerCase() }).select('-__v -updatedAt -createdAt -_id')
                updatedCourse.push({[code]:{course:currentCourses[i],courseData}});
                isCourseChanged=true;
            }
        }
        
    }else{

        if(currentCourses.length>courses.length){
            isCourseAdded=true;
            for(let i=0;i<courses.length;i++){
                if(sortedCourses[i].code!=sortedCurrentCourses[i].code){
                    let code=currentCourses[i].code;
                    const courseData = await CourseModel.findOne({ code: currentCourses[i].code.toLowerCase() }).select('-__v -updatedAt -createdAt -_id')
                    updatedCourse.push({[code]:{course:currentCourses[i],courseData}});
                    isCourseChanged=true;
                    
                }
            }
            for(let i=courses.length;i<currentCourses.length;i++){
                    let code=currentCourses[i].code;
                    const courseData = await CourseModel.findOne({ code: currentCourses[i].code.toLowerCase() }).select('-__v -updatedAt -createdAt -_id')
                    updatedCourse.push({[code]:{course:currentCourses[i],courseData}});
            }

        }else{
            isCourseSubtracted=true;
            for(let i=0;i<currentCourses.length;i++){
                if(sortedCourses[i].code===sortedCurrentCourses[i].code){
                    subtractedCourse.push(sortedCurrentCourses[i].code.toUpperCase());
                    isCourseChanged=true;
                }
            }
            for(let i=currentCourses.length;i<courses.length;i++){
                subtractedCourse.push(sortedCurrentCourses[i].code.toUpperCase());
            }
            
        }
    }


    // checking favourites
    if(currentFavourites){
        if(favourites.length===currentFavourites.length){
            let sortedFav=favourites.sort((a,b)=>a.code-b.code);
            let sortedCurrFav=currentFavourites.sort((a,b)=>a.code-b.code);
            const isSame=sortedFav.every((val,i)=>val===sortedCurrFav[i]);
            isFavouriteUpdated=!isSame;
        }
        else{
            isFavouriteUpdated=true;
        }
    
    }

    return res.json({isCourseAdded,isCourseChanged,isFavouriteUpdated,isCourseSubtracted,updatedCourse,subtractedCourse});
}