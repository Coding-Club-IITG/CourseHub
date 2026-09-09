const major = Number(process.versions.node.split(".")[0]);
if (major !== 24) throw new Error(`CourseHub requires Node 24, found ${process.versions.node}`);
