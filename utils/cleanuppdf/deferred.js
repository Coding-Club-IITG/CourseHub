const csv = require("csv-parser");
const fs = require("fs");
const results = [];

const print = [];

fs.createReadStream("data_deferred.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    results.map((res) => {
      // console.log(res.rollNo.split(","));
      let commaSplit = res.rollNo.split(",").filter((i) => i.length > 3);
      // console.log(commaSplit);
      // console.log(res.courseCode.replace(" ", ""));
      // console.log(res.roomNo);
      // console.log(res.dateAndTime);
      // console.log(res.nStudents);
      commaSplit.map((cs) => {
        let temp = cs.split("+");
        temp.map((t) => {
          let dateAndTimeArr = res.dateAndTime.split(" ");
          let dateStr = dateAndTimeArr[0].split("-").reverse().join("-");
          let date = new Date(dateStr);
          // console.log(dateAndTimeArr);
          let time = dateAndTimeArr[1].substring(1) + "-" + dateAndTimeArr[3];
          time = time.substring(0, time.length - 1);
          // console.log(time);
          let rollArraysPerCourse = t.split(" ").filter((f) => f.length > 3);
          if (rollArraysPerCourse.length == 1) {
            // either backlogger or single rollnumber
            if (rollArraysPerCourse[0].toLowerCase() == "backloggers") {
              console.log({ backloggers: true });
              print.push({
                code: res.courseCode.replace(" ", ""),
                room: res.roomNo,
                date: date,
                time: time,
                nStudents: parseInt(res.nStudents),
                backloggers: true,
              });
            } else {
              // console.log({ individual: parseInt(rollArraysPerCourse[0].replace("\n", "")) });
              print.push({
                code: res.courseCode.replace(" ", ""),
                room: res.roomNo,
                date: date,
                time: time,
                nStudents: parseInt(res.nStudents),
                individual: parseInt(rollArraysPerCourse[0].replace("\n", "")),
              });
            }
          } else if (rollArraysPerCourse.length == 2) {
            // either all students or from-to
            if (rollArraysPerCourse[0].toLowerCase() == "registered") {
              // console.log({ all: true });
              print.push({
                code: res.courseCode.replace(" ", ""),
                room: res.roomNo,
                date: date,
                time: time,
                nStudents: parseInt(res.nStudents),
                all: true,
              });
            } else {
              // console.log({
              //   from: parseInt(rollArraysPerCourse[0].replace("\n", "")),
              //   to: parseInt(rollArraysPerCourse[1].replace("\n", "")),
              // });
              print.push({
                code: res.courseCode.replace(" ", ""),
                room: res.roomNo,
                date: date,
                time: time,
                nStudents: parseInt(res.nStudents),
                from: parseInt(rollArraysPerCourse[0].replace("\n", "")),
                to: parseInt(rollArraysPerCourse[1].replace("\n", "")),
              });
            }
          }
        });
      });
      // console.log("**********");
    });
    // console.log(print);
    // fs.writeFile("test.json", JSON.stringify(print), { encoding: "utf8" }, () => {});
    // let data = JSON.stringify(print);
    fs.writeFileSync("response_deferred.json", JSON.stringify(print), (err) => {
      console.log(err);
      return;
    });
  });
