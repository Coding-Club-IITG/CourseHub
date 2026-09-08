function catchAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch((e) => next(e));
    };
}

export default catchAsync;
