const paths = {
    search: (
        <>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
        </>
    ),
    edit: (
        <>
            <path d="m16 3 5 5-12 12-6 1 1-6Z" />
            <path d="m14 5 5 5" />
        </>
    ),
    trash: (
        <>
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
        </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    refresh: (
        <>
            <path d="M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5" />
        </>
    ),
    info: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6m0-10v1" />
        </>
    ),
    warning: (
        <>
            <path d="m12 3 10 18H2ZM12 9v5m0 3v1" />
        </>
    ),
    userMinus: (
        <>
            <circle cx="9" cy="7" r="4" />
            <path d="M2 21v-3a7 7 0 0 1 14 0v3m1-11h6" />
        </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    upload: (
        <>
            <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />
        </>
    ),
    download: (
        <>
            <path d="M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6" />
        </>
    ),
    eye: (
        <>
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
};

export function Icon({ name, size = 18, ...props }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            {...props}
        >
            {paths[name]}
        </svg>
    );
}
