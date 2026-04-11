import "./styles.scss";
import { previewFile } from "../../../../api/File";
import { toast } from "react-toastify";
import { formatFileName } from "../../../../utils/formatFile";
import { getRandomColor } from "../../../../utils/colors";
import { useDispatch } from "react-redux";
import { UpdateFavourites } from "../../../../actions/user_actions";
import { RemoveFromFavourites } from "../../../../api/User";

const FavouriteCard = ({ type = "file", color, path, name, subject, code, id, _id }) => {
    color = color ? color : getRandomColor();
    const dispatch = useDispatch();

    const handlePreview = async () => {
        const response = await toast.promise(previewFile(id), {
            pending: "Generating preview link...",
            success: "Success!.",
            error: "Something went wrong!",
        });
        window.open(response.url, "_blank");
    };

    const handleRemoveFromFavourites = async () => {
        const resp = RemoveFromFavourites(_id);
        toast.promise(resp, {
            pending: "Removing from favourites.",
        });
        resp.then((data) => {
            if (data?.data?.favourites) {
                dispatch(UpdateFavourites(data.data.favourites));
                toast.success("Removed.");
            } else {
                toast.error("Something went wrong!");
            }
        }).catch((e) => toast.error("Something went wrong!"));
    };

    return (
        <div className="fav-card">
            {type === "folder" ? (
                <svg
                    width="200"
                    height="175"
                    viewBox="0 0 237 187"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M0.200195 186.4V0.400024H105.924L121.027 15.5034H197.857L212.96 0.400024H236.6V186.4H0.200195Z"
                        fill={color ? color : "#7DDEFF"}
                    />
                    <path
                        d="M205.4 8.20007H114.2L121.4 16.0001H198.8L205.4 8.20007Z"
                        fill="#EBEBEB"
                    />
                </svg>
            ) : (
                <svg
                    width="200"
                    height="175"
                    viewBox="0 0 238 187"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M0.800293 186.4V0.400024H200.6L237.2 37.2377V186.4H0.800293Z"
                        fill={color ? color : "#F1F3DA"}
                    />
                    <path d="M200.6 1L236.6 37H200.6V1Z" fill={"#CDCDCD"} fillOpacity="0.5" />
                    <line
                        x1="18.2002"
                        y1="65.8"
                        x2="223.4"
                        y2="65.8"
                        stroke="black"
                        strokeOpacity="0.25"
                        strokeWidth="1.2"
                    />
                    <line
                        x1="18.2002"
                        y1="95.8"
                        x2="223.4"
                        y2="95.8"
                        stroke="black"
                        strokeOpacity="0.25"
                        strokeWidth="1.2"
                    />
                    <line
                        x1="18.2002"
                        y1="123.4"
                        x2="224.6"
                        y2="123.4"
                        stroke="black"
                        strokeOpacity="0.25"
                        strokeWidth="1.2"
                    />
                    <line
                        x1="18.2002"
                        y1="151"
                        x2="224.6"
                        y2="151"
                        stroke="black"
                        strokeOpacity="0.25"
                        strokeWidth="1.2"
                    />
                    <line
                        x1="18.2002"
                        y1="178.6"
                        x2="224.6"
                        y2="178.6"
                        stroke="black"
                        strokeOpacity="0.25"
                        strokeWidth="1.2"
                    />
                </svg>
            )}
            <span className="close" onClick={handleRemoveFromFavourites}></span>
            <div className="content" onClick={handlePreview}>
                <div className="top">
                    <p className="path">{path ? path : "Path"}</p>
                    <p className="name">{name ? formatFileName(name) : "Name"}</p>
                </div>
                <div className="bottom">
                    <p className="subject">{code ? code : ""}</p>
                </div>
            </div>
        </div>
    );
};

export default FavouriteCard;
