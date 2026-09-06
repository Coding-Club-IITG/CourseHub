const major = Number(process.versions.node.split(".")[0]);
if (major < 22) throw new Error(`CourseHub server requires Node 22+, found ${process.versions.node}`);
