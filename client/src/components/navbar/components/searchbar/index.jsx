import React from "react";
import "./styles.scss";
import { useState } from "react";
import { GetSearchResult } from "../../../../api/Search";
import formatLongText from "../../../../utils/formatLongText";
import { useEffect } from "react";
import { capitalise } from "../../../../utils/capitalise";
import { useSelector } from "react-redux";
import SmallLoader from "../../../SmallLoader";
const SearchBar = ({ type }) => {
    const [open, setOpen] = useState(false);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState({});
    const [error, setError] = useState(false);
    const courses = useSelector((state) =>
        state.user.user.courses
            .concat(state.user.user?.previousCourses?.flatMap((sem) => sem.courses) || [])
            .concat(state.user.user?.readOnly)
    );
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
            setSearched(true);
            setLoading(true);
            const fetched2 = courses.find((course) => {
                return (
                    course.code.replaceAll(" ", "").toLowerCase() ===
                    value.replaceAll(" ", "").toLowerCase()
                );
            });
            const fetched = await GetSearchResult(value.split(" "));
            const data = {
                found: fetched2 ? true : false,
                results: [
                    {
                        code: fetched2.code.replaceAll(" ", "").toLowerCase(),
                        name: fetched2.name,
                        isAvailable: true,
                        numberOfWordsMatched: 0,
                        _id: "null",
                    },
                ],
            };
            setFetched(data);
            setError(false);
            setLoading(false);
        } catch (error) {
            setSearched(true);
            setLoading(false);
            setError(true);
            // console.log(error);
        }
    };
    return (
        <div className={`wrap ${type}`}>
            <form
                className="search"
                onSubmit={(e) => {
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
                    setOpen(true);
                }}
                onBlur={() => {
                    if (!fetched?.found) setOpen(false);
                }}
            >
                <input type="text" className="searchTerm" placeholder="Search Courses" />
                <button className="search-img"></button>
            </form>
            {open && (
                <div className={`search-results`} style={searchResultStyle}>
                    {searched ? (
                        loading ? (
                            <SmallLoader text="Searching..." />
                        ) : fetched?.found ? (
                            <>
                                {/* <p
                                    style={{
                                        color: "#fff",
                                        backgroundColor: "#000",
                                        cursor: "pointer",
                                        padding: "10px",
                                    }}
                                    onClick={() => {
                                        if (fetched?.isAvailable)
                                            window.location = "/browse/" + fetched.code;
                                    }}
                                >
                                    {fetched.code?.toUpperCase()}
                                    <br />
                                    {formatLongText(fetched.name, 39)}
                                    {!fetched.isAvailable && " || no data"}
                                </p> */}
                                {fetched.results.map((result) => {
                                    return (
                                        <>
                                            <p
                                                style={{
                                                    color: "#fff",
                                                    backgroundColor: result.isAvailable
                                                        ? "#000"
                                                        : "#636363",
                                                    padding: "15px",
                                                    cursor: result.isAvailable
                                                        ? "pointer"
                                                        : "not-allowed",
                                                }}
                                                onClick={() => {
                                                    if (result.isAvailable) {
                                                        window.location = "/browse/" + result.code;
                                                    }
                                                }}
                                            >
                                                <span className="code">
                                                    {result.code.toUpperCase()}
                                                </span>
                                                <span className="name">
                                                    {capitalise(formatLongText(result.name, 40))}
                                                </span>
                                                <span className="extra-info">
                                                    {!result?.isAvailable && "UNAVAILABLE"}
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
                                        marginTop: "12px",
                                        textDecoration: "underline",
                                    }}
                                >
                                    Close
                                </span>
                            </>
                        ) : (
                            <>
                                Not found! <br />
                                <br /> Please enter the full code like cs101 and you can only view
                                your own courses{" "}
                                <span
                                    onClick={() => setOpen(false)}
                                    style={{
                                        cursor: "pointer",
                                        display: "block",
                                        marginTop: "12px",
                                        textDecoration: "underline",
                                    }}
                                >
                                    Close
                                </span>
                            </>
                        )
                    ) : error ? (
                        "error"
                    ) : (
                        "Press Enter to search"
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
