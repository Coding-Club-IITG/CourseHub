const userReducer = (
  state = {
    user: null,
    isLoggedIn: false,
  },
  action
) => {
  switch (action.type) {
    case "LOGGED_IN":
      return {
        ...state,
        user: action.payload.user,
      };
    case "AUTH_COMPLETE":
      console.log(action);
      return {
        ...state,
        isLoggedIn: action.payload.isLoggedIn,
      };
    default:
      return state;
  }
};
export default userReducer;
