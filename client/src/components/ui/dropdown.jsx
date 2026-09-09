import { useState, useRef, useEffect } from "react";
import "./dropdown.scss";

const Dropdown = ({
    value,
    onValueChange,
    placeholder = "Select an option",
    options = [],
    disabled = false,
    className = "",
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);

    const selectedOption = options.find((option) => option.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setFocusedIndex(-1);
            }
        };

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                setFocusedIndex(-1);
                triggerRef.current?.focus();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const handleKeyDown = (event) => {
        if (disabled) return;

        switch (event.key) {
            case "Enter":
            case " ":
                event.preventDefault();
                if (isOpen && focusedIndex >= 0) {
                    handleSelect(options[focusedIndex].value);
                } else {
                    setIsOpen(!isOpen);
                }
                break;
            case "ArrowDown":
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                    setFocusedIndex(0);
                } else {
                    setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
                }
                break;
            case "ArrowUp":
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                    setFocusedIndex(options.length - 1);
                } else {
                    setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
                }
                break;
        }
    };

    const handleSelect = (optionValue) => {
        onValueChange(optionValue);
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
    };

    return (
        <div ref={dropdownRef} className={`coursehub-dropdown ${className}`} {...props}>
            <button
                ref={triggerRef}
                type="button"
                className={`coursehub-dropdown__trigger ${
                    isOpen ? "coursehub-dropdown__trigger--open" : ""
                } ${disabled ? "coursehub-dropdown__trigger--disabled" : ""}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-labelledby="dropdown-label"
            >
                <span className="coursehub-dropdown__value">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`coursehub-dropdown__icon ${
                        isOpen ? "coursehub-dropdown__icon--rotated" : ""
                    }`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div className="coursehub-dropdown__content">
                    <div
                        className="coursehub-dropdown__viewport"
                        role="listbox"
                        aria-labelledby="dropdown-label"
                    >
                        {options.map((option, index) => (
                            <div
                                key={option.value}
                                className={`coursehub-dropdown__item ${
                                    value === option.value
                                        ? "coursehub-dropdown__item--selected"
                                        : ""
                                } ${
                                    focusedIndex === index
                                        ? "coursehub-dropdown__item--focused"
                                        : ""
                                }`}
                                role="option"
                                aria-selected={value === option.value}
                                onClick={() => handleSelect(option.value)}
                                onMouseEnter={() => setFocusedIndex(index)}
                            >
                                <span className="coursehub-dropdown__item-text">
                                    {option.label}
                                </span>
                                {value === option.value && (
                                    <svg
                                        className="coursehub-dropdown__check"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="20,6 9,17 4,12"></polyline>
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dropdown;
