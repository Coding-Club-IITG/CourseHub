import { combineReducers } from "redux";
import userReducer from "./user-reducer";
const reducers = combineReducers({
  auth: userReducer,
});

export default reducers;
