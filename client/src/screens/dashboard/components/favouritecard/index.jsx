import { Link } from "react-router-dom";
import { useFavourite } from "../../../../queries/favourites";
import { resourcePath } from "../../../../utils/resourceLink";
import FileDisplay from "../../../browse/components/file-display";
import "./styles.scss";

export default function FavouriteCard({ favourite }) {
    const { toggle, saving } = useFavourite(favourite.id, favourite.code);
    if (!favourite.available)
        return (
            <article className="favourite-unavailable">
                <h3>Unavailable file</h3>
                <p>This file was removed or you no longer have access.</p>
                <button type="button" disabled={saving} onClick={toggle}>
                    {saving ? "Removing…" : "Remove from favourites"}
                </button>
            </article>
        );
    return (
        <article className="favourite-card">
            <Link
                className="favourite-location"
                to={resourcePath(favourite.code, favourite.folderId, favourite.id)}
            >
                <strong>{favourite.code}</strong>
                <span>{favourite.path}</span>
            </Link>
            <FileDisplay
                file={favourite.file}
                courseCode={favourite.code}
                folderId={favourite.folderId}
            />
        </article>
    );
}
