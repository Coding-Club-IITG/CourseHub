export const isBR = (req, res, next) => {
    if (req.admin || req.user?.isBR === true) {
        next();
    } else {
        res.status(403).json({ message: "Not authorized as BR" });
    }
};
