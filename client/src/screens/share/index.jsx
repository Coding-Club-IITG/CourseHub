import "./styles.scss";
import Wrapper from "../contributions/components/wrapper";
import SectionShare from "./components/SectionShare";
import { toast } from "react-toastify";
const Share = (props) => {
    const copyHandler = async () => {
        try {
            await navigator.clipboard.writeText(props.link);
            toast.success("Link Copied to Clipboard");
        } catch {
            toast.error("Could not copy the link. Select it and copy it manually.");
        }
    };
    return (
        <SectionShare>
            <Wrapper>
                <div className="share-heading">Share the Link</div>
                <div className="encloser">
                    <input
                        type="text"
                        value={props.link}
                        className="shareinput"
                        readOnly
                        aria-label="Share link"
                    />{" "}
                    <button
                        type="button"
                        className="clip"
                        aria-label="Copy link"
                        onClick={copyHandler}
                    />
                </div>
                <div className="bottom-banner"></div>
            </Wrapper>
        </SectionShare>
    );
};
export default Share;
