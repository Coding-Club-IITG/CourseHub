import React from "react";
import cross from "../browsefolder/cross.svg";

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
        margin: "1em",
        
    },
    heading: {
        fontSize: "2em",
        color: "black",
    },
    message: {
        fontSize: "1em",
        color: "#374151",
        margin: "1em",
    },
    buttonGroup: {
        display: "flex",
        justifyContent: "center",
        gap: "1em",
    },
    deleteBtn: {
        display: "flex",
        alignItems: "center",
        backgroundColor: "#ef4444",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1em",
    },
    cancelBtn: {
        backgroundColor: "#9ca3af",
        color: "#fff",
        border: "none",
        padding: "10px 18px",
        borderRadius: "5px",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1em",
    },
};


const ConfirmDelDialog = ({ isOpen, onConfirm, onCancel, isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.dialog}>
                <img src={cross} alt="Delete" style={styles.iconImage} />
                <h3 style={styles.heading}>Are you sure?</h3>
                <p style={styles.message}>
                    All the folders and files inside this year will be permanently deleted.
                    Do you want to permanently delete this year? This action cannot be undone.
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
                        {isLoading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export { ConfirmDelDialog };
