import React from "react";
import cross from "./cross.svg";

const styles = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    dialog: {
        backgroundColor: "#fff",
        padding: "25px 30px",
        borderRadius: "8px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        textAlign: "center",
        fontFamily: "sans-serif",
    },
    iconImage: {
        width: "80px",
        height: "80px",
        margin: "0 auto 1em auto", // fixed top margin issue
        display: "block",
    },
    heading: {
        fontSize: "2em",
        margin: "0.5em 0",
    },
    message: {
        fontSize: "1em",
        color: "#374151",
        margin: "1em 0 1.5em 0",
    },
    buttonGroup: {
        display: "flex",
        justifyContent: "center",
        gap: "1em",
        width: "100%",
    },
    deleteBtn: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#dc2626",
        color: "#fff",
        border: "none",
        padding: "12px 24px",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1em",
    },
    cancelBtn: {
        backgroundColor: "#6b7280",
        color: "#fff",
        border: "1px solid #d1d5db",
        padding: "12px 24px",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1em",
    },
};

const ConfirmDialog = ({ isOpen, onConfirm, onCancel, isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.dialog}>
                <img src={cross} alt="Delete" style={styles.iconImage} />
                <h3 style={styles.heading}>Are you sure?</h3>
                <p style={styles.message}>
                    Do you want to remove this course? It can be added again.
                </p>
                <div style={styles.buttonGroup}>
                    <button style={styles.cancelBtn} onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        style={{ ...styles.deleteBtn, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? "not-allowed" : "pointer" }}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? "Removing..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export { ConfirmDialog };
