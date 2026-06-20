import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { fetchCourseDashboardData, deleteNode, handleContribution } from "@/apis/courses";
import {
    FiFolder,
    FiFile,
    FiTrash2,
    FiChevronRight,
    FiChevronDown,
    FiUsers,
    FiCheckCircle,
    FiInbox,
    FiCheck,
    FiX,
} from "react-icons/fi";

function LoadStructure({ node, onDelete, depth = 0 }) {
    const isFolder = node.childType === "Folder" || node.children;
    const nodeType = isFolder ? "folder" : "file";

    const [open, setOpen] = useState(true);
    const hasChildren = isFolder && node.children && node.children.length > 0;

    return (
        <div>
            <div
                className="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-100"
                style={{ paddingLeft: `${10 + depth * 22}px` }}
            >
                {isFolder ? (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-label={open ? "Collapse folder" : "Expand folder"}
                        className="grid h-5 w-5 flex-shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                    >
                        {hasChildren ? (open ? <FiChevronDown /> : <FiChevronRight />) : null}
                    </button>
                ) : (
                    <span className="w-5 flex-shrink-0" />
                )}

                <span className={`grid flex-shrink-0 place-items-center text-base ${isFolder ? "text-blue-600" : "text-slate-500"}`}>
                    {isFolder ? <FiFolder /> : <FiFile />}
                </span>

                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{node.name}</span>

                <button
                    type="button"
                    title={`Delete ${node.name}`}
                    aria-label={`Delete ${node.name}`}
                    onClick={() => onDelete(nodeType, node._id, node.name)}
                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md text-red-600 opacity-0 hover:bg-red-50 group-hover:opacity-100"
                >
                    <FiTrash2 />
                </button>
            </div>

            {isFolder && open &&
                node.children?.map((child) => (
                    <LoadStructure
                        key={child._id}
                        node={child}
                        onDelete={onDelete}
                        depth={depth + 1}
                    />
                ))}
        </div>
    );
}

export default function CourseDashboard() {
    const { code } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("structure");

    useEffect(() => {
        loadData();
    }, [code]);

    const loadData = async () => {
        try 
        {
            const getDashboard = await fetchCourseDashboardData(code);
            setData(getDashboard);
        } 
        catch (error) 
        {
            console.log(error);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    const handleContributionAction = async(contributionId, action) =>
    {
        const isApprove = action == "approve";
        if(!window.confirm(`Are you sure you want to ${action} this contribution`))
        {
            return;
        }

        try
        {
            await handleContribution(contributionId,action);
            alert(`Contribution ${isApprove ? 'Approved' : 'Rejected'} succesfully!`);
            loadData();
        }
        catch(error)
        {
            console.log(error);
            alert("error");
        }   
    }

   const handleDelete = async (type, id, name) => 
    {
        if (!window.confirm(`Are you SURE you want to permanently delete the ${type} "${name}"? This cannot be undone.`)) 
        {
            return;
        }
        try 
        {
            await deleteNode(type, id);
            loadData();
        } 
        catch (error) 
        {
            console.error(error);
            alert(`Failed to delete the ${type}. Check the console.`);
        }
    };

    if (loading) 
    {
        return (
            <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-600">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                Loading dashboard…
            </div>
        );
    }

    const studentCount = data?.studentCount || 0;
    const approvedContributions =  data?.contributions?.filter(c => c.approved) || [];
    const verifiedFilesCount = approvedContributions.reduce((total,contribution) =>
    {
        return total + (contribution.files?.length || 0);
    },0);

    const pendingContributions = data?.contributions?.filter(c => !c.approved) || [];

    return (
        <div className="min-h-full bg-slate-100 text-slate-900">
            <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-7 py-4">
                <h1 className="text-lg font-bold tracking-tight">
                    {data?.course?.code}
                    <span className="font-medium text-slate-600">  ·  {data?.course?.name}</span>
                </h1>
            </header>

            <div className="flex max-w-5xl flex-col gap-6 p-7">
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-blue-50 text-xl text-blue-600">
                            <FiUsers />
                        </span>
                        <div>
                            <div className="text-2xl font-bold leading-tight tracking-tight">{studentCount}</div>
                            <div className="mt-0.5 text-xs text-slate-600">Registered students</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                        <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-green-50 text-xl text-green-600">
                            <FiCheckCircle />
                        </span>
                        <div>
                            <div className="text-2xl font-bold leading-tight tracking-tight">{verifiedFilesCount}</div>
                            <div className="mt-0.5 text-xs text-slate-600">Verified contributions</div>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 text-sm font-semibold">
                        <FiFolder className="text-slate-600" /> Course structure
                    </div>
                    <div className="p-2.5">
                        {data?.course?.children?.length ? (
                            data.course.children.map((child) => (
                                <LoadStructure key={child._id} node={child} onDelete={handleDelete} />
                            ))
                        ) : (
                            <div className="px-5 py-9 text-center text-slate-600">
                                <span className="mb-2.5 inline-grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
                                    <FiFolder />
                                </span>
                                <div className="text-sm font-semibold text-slate-900">No folders or files yet</div>
                                <div className="mt-0.5 text-sm">Course content will appear here once added.</div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 text-sm font-semibold">
                        <FiInbox className="text-slate-600" /> Pending contributions
                        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {pendingContributions.length}
                        </span>
                    </div>
                    <div className="p-2.5">
                        {pendingContributions.length === 0 ? (
                            <div className="px-5 py-9 text-center text-slate-600">
                                <span className="mb-2.5 inline-grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-xl text-slate-400">
                                    <FiCheckCircle />
                                </span>
                                <div className="text-sm font-semibold text-slate-900">You're all caught up</div>
                                <div className="mt-0.5 text-sm">New submissions will show up here for review.</div>
                            </div>
                        ) : (
                            pendingContributions.map((contribution) => (
                                <div
                                    key={contribution.contributionId}
                                    className="m-1.5 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-3"
                                >
                                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-amber-50 text-base text-amber-700">
                                        <FiFile />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="break-all text-sm font-semibold">{contribution.contributionId}</div>
                                        <div className="text-xs text-slate-600">Awaiting review</div>
                                    </div>
                                    <div className="flex flex-shrink-0 gap-2">
                                        <button
                                            onClick={() => handleContributionAction(contribution.contributionId, 'approve')}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700"
                                        >
                                            <FiCheck /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleContributionAction(contribution.contributionId, 'reject')}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 hover:border-red-200 hover:bg-red-50"
                                        >
                                            <FiX /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}