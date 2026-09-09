import { useState } from "react";
import { useSession } from "../session/context";
import { session } from "../session/runtime";
import { AddToFavourites, RemoveFromFavourites } from "../api/User";
import { toast } from "react-toastify";

export function useFavourite(id, code) {
    const actor = useSession().data;
    const favourite = actor?.favourites?.find((item) => item.id === id);
    const [saving, setSaving] = useState(false);
    const toggle = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const data = await (favourite
                ? RemoveFromFavourites(favourite._id)
                : AddToFavourites(id, code));
            if (!Array.isArray(data.favourites))
                throw new Error("Favourites could not be read. Please retry.");
            session.setActor((current) => ({ ...current, favourites: data.favourites }));
            toast.success(favourite ? "Removed from favourites" : "Added to favourites");
        } catch (error) {
            toast.error(error.message || "Favourites could not be saved. Please retry.");
        } finally {
            setSaving(false);
        }
    };
    return { favourite, saving, toggle };
}
