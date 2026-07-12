import React, { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalCloseButton } from "./ui/modal";
import { uploadBRs, createBR } from "../apis/br";
import { FaUser, FaFileCsv } from "react-icons/fa";

const AddBRs = ({ onSuccess, onClose }) => {
    const [tab, setTab] = useState("single");

    const [email, setEmail] = useState("");
    const [singleLoading, setSingleLoading] = useState(false);
    const [singleError, setSingleError] = useState(null);
    const [singleSuccess, setSingleSuccess] = useState(null);

    const [file, setFile] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkError, setBulkError] = useState(null);
    const [bulkSuccess, setBulkSuccess] = useState(null);
    const [bulkWarnings, setBulkWarnings] = useState(null);

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        setSingleError(null);
        setSingleSuccess(null);
        if (!email.trim()) { setSingleError("Please enter an email address."); return; }
        if (!email.includes("@")) { setSingleError("Please enter a valid email address."); return; }
        setSingleLoading(true);
        try {
            await createBR(email.trim());
            setSingleSuccess(`Successfully added ${email.trim()} as a BR.`);
            setEmail("");
            if (onSuccess) onSuccess();
        } catch (err) {
            setSingleError(err.message || "Failed to add BR.");
        } finally {
            setSingleLoading(false);
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        setBulkError(null);
        setBulkSuccess(null);
        setBulkWarnings(null);
        if (!file) { setBulkError("Please select a CSV file."); return; }
        if (!file.name.toLowerCase().endsWith(".csv")) { setBulkError("Please upload a CSV file."); return; }
        setBulkLoading(true);
        try {
            const response = await uploadBRs(file);
            setBulkSuccess(response.message);
            setFile(null);
            if (onSuccess) onSuccess();
        } catch (err) {
            if (err.existingEmails || err.notInUsers) {
                let warning = "";
                if (err.existingEmails?.length > 0)
                    warning += `Already existing BRs: ${err.existingEmails.join(", ")}. `;
                if (err.notInUsers?.length > 0)
                    warning += `Not found in users: ${err.notInUsers.join(", ")}.`;
                setBulkWarnings(warning);
                setBulkSuccess("Partial upload completed.");
                if (onSuccess) onSuccess();
            } else {
                setBulkError(err.error || err.message || "An error occurred during upload.");
            }
        } finally {
            setBulkLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose}>
            <ModalCloseButton onClose={onClose} />
            <ModalHeader className="text-xl font-bold text-gray-900 mb-0">
                Add Branch Representatives
            </ModalHeader>

            <div className="flex gap-1 mt-4 mb-5 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setTab("single")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                        tab === "single"
                            ? "bg-white text-blue-700 shadow-sm border border-gray-200/80"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <FaUser className="h-3.5 w-3.5" />
                    Single BR
                </button>
                <button
                    onClick={() => setTab("bulk")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                        tab === "bulk"
                            ? "bg-white text-blue-700 shadow-sm border border-gray-200/80"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <FaFileCsv className="h-3.5 w-3.5" />
                    Bulk Upload
                </button>
            </div>

            <ModalBody>
                {tab === "single" && (
                    <div>
                        <p className="text-sm text-gray-500 mb-4">
                            Add a single user as a Branch Representative using their registered email.
                        </p>
                        <form onSubmit={handleSingleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="e.g. student@iitg.ac.in"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setSingleError(null); setSingleSuccess(null); }}
                                    disabled={singleLoading}
                                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all disabled:opacity-50"
                                />
                            </div>
                            {singleError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">{singleError}</p>}
                            {singleSuccess && <p className="text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-md">{singleSuccess}</p>}
                            <button
                                type="submit"
                                disabled={singleLoading || !email.trim()}
                                className="mt-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-md shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {singleLoading ? (
                                    <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Adding...</>
                                ) : "Add BR"}
                            </button>
                        </form>
                    </div>
                )}

                {tab === "bulk" && (
                    <div>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload a CSV file with one column named{" "}
                            <code className="bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">email</code>{" "}
                            to add multiple BRs at once.
                        </p>
                        <form onSubmit={handleBulkSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">CSV File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => { setFile(e.target.files[0]); setBulkError(null); setBulkSuccess(null); setBulkWarnings(null); }}
                                    disabled={bulkLoading}
                                    className="block w-full text-sm text-gray-500 border border-gray-200 rounded-md cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 file:mr-4 file:py-2 file:px-3 file:border-0 file:border-r file:border-gray-200 file:text-sm file:font-medium file:bg-white file:text-blue-700 hover:file:bg-blue-50 transition-all disabled:opacity-50"
                                />
                                {file && <p className="text-xs text-gray-500 mt-1">Selected: <span className="font-medium text-gray-700">{file.name}</span></p>}
                            </div>
                            {bulkError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">{bulkError}</p>}
                            {bulkSuccess && <p className="text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-md">{bulkSuccess}</p>}
                            {bulkWarnings && <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 px-3 py-2 rounded-md"><strong>Warning:</strong> {bulkWarnings}</p>}
                            <button
                                type="submit"
                                disabled={bulkLoading || !file}
                                className="mt-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-md shadow-sm hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {bulkLoading ? (
                                    <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />Uploading...</>
                                ) : "Upload CSV"}
                            </button>
                        </form>
                    </div>
                )}
            </ModalBody>
        </Modal>
    );
};

export default AddBRs;
