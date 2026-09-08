class AppError extends Error {
    constructor(status, message, code, fieldErrors) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors;
    }
}
export default AppError;
