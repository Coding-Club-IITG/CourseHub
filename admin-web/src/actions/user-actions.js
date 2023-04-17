export function userLoggedIn(data) {
  return {
    type: "LOGGED_IN",
    payload: {
      user: data,
    },
  };
}

export function userAuthCompleted() {
  return {
    type: "AUTH_COMPLETE",
    payload: {
      isLoggedIn: true,
    },
  };
}
