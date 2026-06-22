import React, { useState, useEffect } from "react";
import BrTable from "../components/brTable";
import UploadBRs from "../components/UploadBRs";
import { fetchBRs, createBR ,deleteBR } from "@/apis/br";
import { FaPlus, FaUpload } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BranchRepresentatives() {
    const [brs, setBrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Single BR states
    const [newBrEmail, setNewBrEmail] = useState("");
    const [addingBr, setAddingBr] = useState(false);
    const [addError, setAddError] = useState(null);
    const [addSuccess, setAddSuccess] = useState(null);

    const loadBRs = async () => {
        try {
            setLoading(true);
            const response = await fetchBRs();
            setBrs(response.brs);
            setLoading(false);
        } catch (err) {
            setError(err.message || "An error occurred while fetching BRs.");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBRs();
    }, []);

    const handleUploadSuccess = () => {
        setShowUploadModal(false);
        loadBRs();
    };

    const handleAddSingleBR = async (e) => {
        e.preventDefault();
        setAddError(null);
        setAddSuccess(null);

        if (!newBrEmail.trim()) {
            setAddError("Please enter an email address.");
            return;
        }

        if (!newBrEmail.includes("@")) {
            setAddError("Please enter a valid email address.");
            return;
        }

        setAddingBr(true);
        try {
            await createBR(newBrEmail.trim());
            setAddSuccess(`Successfully added ${newBrEmail}`);
            setNewBrEmail("");
            loadBRs(); // Refresh the list
        } catch (err) {
            setAddError(err.message || "Failed to add BR.");
        } finally {
            setAddingBr(false);
            // Clear success message after 3 seconds
            if (!addError) {
                setTimeout(() => setAddSuccess(null), 3000);
            }
        }
    }    
    
    const handleDeleteBR = async(email) => {
        const isConfirmed = window.confirm(`Are you sure you want to remove ${email} as a Branch Representative ?`);
        if(!isConfirmed){
            return ;
        }
        // error == er ;
        try {
            setLoading(true);
            await deleteBR(email);
            await loadBRs();
        }
        catch(er){
            console.error("Failed to delete BR :" , er);
            setError(er.message || "An error occurred while trying to remove the BR" );
            setLoading(false);
        }

    }

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Branch Representatives</h1>
                    <p className="text-gray-600 mt-1">Manage and upload BR data</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <form onSubmit={handleAddSingleBR} className="flex w-full sm:w-auto gap-2">
                        <div className="relative">
                            <Input
                                type="email"
                                placeholder="Add single BR email..."
                                value={newBrEmail}
                                onChange={(e) => setNewBrEmail(e.target.value)}
                                className="w-full sm:w-64"
                                disabled={addingBr}
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={addingBr || !newBrEmail.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {addingBr ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <FaPlus className="h-4 w-4 mr-2" />
                            )}
                            Add
                        </Button>
                    </form>
                    <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
                    <Button
                        type="button"
                        onClick={() => setShowUploadModal(true)}
                        variant="outline"
                        className="w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        <FaUpload className="h-4 w-4 mr-2" />
                        Bulk Upload
                    </Button>
                </div>
            </div>

            {/* Status Messages for Single Add */}
            {(addError || addSuccess) && (
                <div className={`p-4 rounded-xl border ${addError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    {addError || addSuccess}
                </div>
            )}

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && !error && <BrTable brs={brs} onDelete={handleDeleteBR}  />}
            </div>

            {showUploadModal && (
                <UploadBRs
                    onUpload={handleUploadSuccess}
                    onClose={() => setShowUploadModal(false)}
                />
            )}
        </div>
    );
}
