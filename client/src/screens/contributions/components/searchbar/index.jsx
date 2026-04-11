import React from "react";
import "./styles.scss";
import { useState } from "react";
import { GetSearchResult } from "../../../../api/Search";
import formatLongText from "../../../../utils/formatLongText";
import { useEffect } from "react";
import { capitalise } from "../../../../utils/capitalise";
import SmallLoader from "../../../../components/SmallLoader";
const SearchBar = ({ type, handleSetCourse }) => {
    const [open, setOpen] = useState(false);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState({});
    const [error, setError] = useState(false);
    const [selected, setSelected] = useState(null);
    const [searchResultStyle, setSearchResultStyle] = useState({
        "max-height": "15%",
    });
    useEffect(() => {
        if (!error && searched) {
            if (fetched?.results.length == 1) {
                setSearchResultStyle({
                    "max-height": "15%",
                });
            } else if (fetched?.results.length == 2) {
                setSearchResultStyle({
                    "max-height": "20%",
                });
            } else {
                setSearchResultStyle({
                    "max-height": "28%",
                });
            }
        }
    }, [fetched]);

    const handleSubmit = async (value) => {
        if (!value) return;
        try {
            setOpen(true);
            setSearched(true);
            setLoading(true);
            const fetched = await GetSearchResult(value.split(" "));
            setFetched(fetched.data);
            setError(false);
            setLoading(false);
            setSelected(null);
        } catch (error) {
            setSearched(true);
            setLoading(false);
            setError(true);
            setSelected(null);
        }
    };
    return (
        <div className={`cwrap ${type}`}>
            <form
                className="csearch"
                onSubmit={(e) => {
                    setSelected(null);
                    e.preventDefault();
                    handleSubmit(e.target[0].value);
                }}
                onChange={() => {
                    setSearched(false);
                    setError(false);
                    setLoading(false);
                    setFetched({});
                }}
                onFocus={() => {
                }}
                onBlur={() => {
                    if (!fetched?.found) setOpen(false);
                }}
            >
                <input
                    type="text"
                    className="csearchTerm"
                    placeholder={
                        selected
                            ? `${selected.split("|")[0].toUpperCase()} ${formatLongText(
                                  capitalise(selected.split("|")[1]),
                                  19
                              )}`
                            : "Search Courses"
                    }
                    value={selected && ""}
                    disabled={selected ? true : false}
                />
                {!selected && <button className="csearch-img"></button>}
                {selected && <button className="csearch-cancel"></button>}
                {open && (
                    <div className={`csearch-results`} style={searchResultStyle}>
                        {searched ? (
                            loading ? (
                                <SmallLoader text="Searching..." />
                            ) : fetched?.found ? (
                                <>
                                    {fetched.results.map((result) => {
                                        return (
                                            <>
                                                <p
                                                    style={{
                                                        color: "#fff",
                                                        backgroundColor: "#000",
                                                        cursor: "pointer",
                                                        padding: "10px",
                                                    }}
                                                    onClick={() => {
                                                        handleSetCourse(result);
                                                        setSelected(
                                                            `${result.code}|${result.name}`
                                                        );
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <span className="ccode">
                                                        {result.code.toUpperCase()}
                                                    </span>
                                                    <span className="cname">
                                                        {capitalise(
                                                            formatLongText(result.name, 40)
                                                        )}
                                                    </span>
                                                </p>
                                                <hr />
                                            </>
                                        );
                                    })}
                                    <span
                                        onClick={() => setOpen(false)}
                                        style={{
                                            cursor: "pointer",
                                            display: "block",
                                            marginTop: "",
                                            textDecoration: "underline",
                                            backgroundColor: "#000",
                                            color: "#fff",
                                            padding: "5px 5px",
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        Close
                                    </span>
                                </>
                            ) : (
                                "not found"
                            )
                        ) : error ? (
                            "error"
                        ) : (
                            "Press Enter to search"
                        )}
                    </div>
                )}
            </form>
        </div>
    );
};

export default SearchBar;
