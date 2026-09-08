const currdate = new Date();
const currdatenumber = currdate.getDate();
const currentYear = currdate.getFullYear().toString();
const currentMonth = currdate.getMonth();

var session;
//session='Jan-May';
if (currentMonth <= 5 || (currentMonth == 6 && currdatenumber <= 23)) session = "Jan-May";
else session = "July-Nov";

export default {
    currentYear,
    session,
    semesterMap: {
        23: 2,
        22: 4,
        21: 6,
        20: 8,
        19: 9,
    },
};
