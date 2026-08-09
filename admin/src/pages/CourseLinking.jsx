import React, { useState } from "react";
import {
    FaLink,
    FaUpload,
    FaInfoCircle,
    FaExclamationTriangle,
    FaCheckCircle,
    FaFileCsv,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { API_BASE_URL } from "@/apis/server";

const CourseLinking = () => {
    // UI State for active tab
    const [activeTab, setActiveTab] = useState("manual"); // 'manual' or 'bulk'

    // Bulk Linking States
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    // Manual Linking States
    const [manualOldCode, setManualOldCode] = useState("");
    const [manualNewCode, setManualNewCode] = useState("");
    const [manualLoading, setManualLoading] = useState(false);
    const [manualError, setManualError] = useState(null);
    const [manualSuccess, setManualSuccess] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResults(null);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);
        setResults(null);
        
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${API_BASE_URL}api/admin/courses/bulk-link`, {
                method: "POST",
                headers: {
                    Authorization: "Bearer admin-coursehub-cc23-golang",
                },
                body: formData,
                credentials: "include",
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`Server error (${response.status}): ${text.slice(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(data.message || "Bulk linking failed");
            }

            setResults(data.summary);
            setFile(null); // Reset file input after success
            
            if (data.summary.success > 0 && data.summary.failed === 0) {
                setError(null);
            }
        } catch (err) {
            console.error("Bulk linking error:", err);
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleManualLink = async () => {
        if (!manualOldCode || !manualNewCode) return;

        setManualLoading(true);
        setManualError(null);
        setManualSuccess(null);

        try {
            const response = await fetch(`${API_BASE_URL}api/admin/course/${manualNewCode.toLowerCase().trim()}/link`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer admin-coursehub-cc23-golang",
                },
                body: JSON.stringify({ legacyCode: manualOldCode.toUpperCase().trim() }),
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Manual linking failed");
            }

            setManualSuccess(`Successfully linked ${manualOldCode.toUpperCase()} to ${manualNewCode.toUpperCase()}`);
            setManualOldCode("");
            setManualNewCode("");
        } catch (err) {
            console.error("Manual linking error:", err);
            setManualError(err.message);
        } finally {
            setManualLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center gap-4 pb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                        <FaLink className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent tracking-tight">
                            Course Linking
                        </h1>
                        <p className="text-gray-600 text-sm mt-1 font-medium">
                            Link legacy courses to new course codes.
                        </p>
                    </div>
                </div>

                {/* Instructions Alert */}
                <Alert className="bg-white/80 backdrop-blur-sm border border-blue-100 shadow-sm rounded-xl">
                    <FaInfoCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900 font-semibold">What happens when you link courses?</AlertTitle>
                    <AlertDescription className="text-sm text-blue-800/80 mt-2">
                        <ul className="list-disc list-inside space-y-1">
                            <li>The new course code will display folders from the legacy course.</li>
                            <li>If the new course already has files in a specific year, those files are kept. The legacy folders for that year will not overwrite them.</li>
                            <li>Folders are shared. Deleting a shared folder from one course only removes the link for that course; the folder is kept for the other course.</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                {/* Tab Navigation */}
                <div className="flex space-x-2 border-b border-gray-200/60 pt-2">
                    <button
                        onClick={() => setActiveTab("manual")}
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === "manual"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300"
                        }`}
                    >
                        Single Course Link
                    </button>
                    <button
                        onClick={() => setActiveTab("bulk")}
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                            activeTab === "bulk"
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300"
                        }`}
                    >
                        Bulk Link (CSV)
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                    
                    {/* Left Column: Input Forms */}
                    <div>
                        {activeTab === "manual" && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all hover:shadow-xl">
                                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaLink className="h-4 w-4 text-blue-500" />
                                    Link a Single Course
                                </h2>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">Legacy Course Code</label>
                                        <Input
                                            value={manualOldCode}
                                            onChange={(e) => setManualOldCode(e.target.value)}
                                            placeholder="e.g., CS101"
                                            className="uppercase border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-700">New Course Code</label>
                                        <Input
                                            value={manualNewCode}
                                            onChange={(e) => setManualNewCode(e.target.value)}
                                            placeholder="e.g., CSN101"
                                            className="uppercase border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleManualLink}
                                        disabled={!manualOldCode || !manualNewCode || manualLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2 shadow-md shadow-blue-200"
                                    >
                                        {manualLoading ? "Processing..." : "Link Course"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeTab === "bulk" && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all hover:shadow-xl">
                                <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <FaUpload className="h-4 w-4 text-blue-500" />
                                    Upload CSV
                                </h2>
                                <p className="text-sm text-gray-600 mb-5">
                                    Upload a CSV file containing exactly two columns. The first column is the <strong>legacy course code</strong>, and the second column is the <strong>new course code</strong>. No column headers are required.
                                </p>
                                
                                <div className="space-y-5">
                                    <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50/50 hover:bg-blue-50 transition-colors">
                                        <input
                                            type="file"
                                            id="csv-upload"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                                            <FaFileCsv className="h-8 w-8 text-blue-400 mb-2" />
                                            <span className="text-sm font-medium text-blue-700">
                                                {file ? file.name : "Click to select a CSV file"}
                                            </span>
                                        </label>
                                    </div>

                                    <Button
                                        onClick={handleUpload}
                                        disabled={!file || uploading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                                    >
                                        {uploading ? "Processing..." : "Upload and Link"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Status & Results */}
                    <div className="space-y-4">
                        
                        {/* Manual Success Status */}
                        {activeTab === "manual" && manualSuccess && (
                            <Alert className="bg-green-50 border border-green-200 text-green-800 shadow-sm rounded-xl">
                                <FaCheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>{manualSuccess}</AlertDescription>
                            </Alert>
                        )}

                        {/* Manual Error Status */}
                        {activeTab === "manual" && manualError && (
                            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 shadow-sm rounded-xl">
                                <FaExclamationTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{manualError}</AlertDescription>
                            </Alert>
                        )}

                        {/* Bulk Error Status */}
                        {activeTab === "bulk" && error && (
                            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 shadow-sm rounded-xl">
                                <FaExclamationTriangle className="h-4 w-4 text-red-600" />
                                <AlertTitle>Upload Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Bulk Results Status */}
                        {activeTab === "bulk" && results && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 flex flex-col transition-all hover:shadow-xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <FaCheckCircle className="h-5 w-5 text-green-600" />
                                    <h3 className="text-lg font-semibold text-gray-800">Linking Summary</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-green-50/80 rounded-xl p-4 border border-green-100 text-center">
                                        <div className="text-sm font-medium text-green-600 uppercase tracking-wide">Successful</div>
                                        <div className="text-3xl font-bold text-green-700 mt-1">{results.success}</div>
                                    </div>
                                    <div className="bg-red-50/80 rounded-xl p-4 border border-red-100 text-center">
                                        <div className="text-sm font-medium text-red-600 uppercase tracking-wide">Failed</div>
                                        <div className={`text-3xl font-bold mt-1 ${results.failed > 0 ? 'text-red-700' : 'text-red-400'}`}>
                                            {results.failed}
                                        </div>
                                    </div>
                                </div>
                                
                                {results.errors && results.errors.length > 0 && (
                                    <div className="mt-2">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Errors:</h4>
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2 border border-gray-200/60 rounded-lg p-3 bg-gray-50/50">
                                            {results.errors.map((err, i) => (
                                                <div key={i} className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                    <span className="font-semibold text-gray-900">{err.oldCode} ➔ {err.newCode}:</span> {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseLinking;