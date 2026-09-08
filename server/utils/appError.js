class AppError extends Error {
    constructor(status, message) {
        super();
        this.message = message;
        this.status = status;
    }
}
export default AppError;
