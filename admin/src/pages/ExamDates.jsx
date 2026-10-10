import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchExamDates, saveExamDates } from "@/apis/event";

const emptyDates = { midSem: "", endSem: "" };

const DateGroup = ({ title, dates, onChange, disabled }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-sm font-medium text-gray-700">
                <span>Mid-Sem</span>
                <Input
                    type="date"
                    value={dates.midSem}
                    onChange={(e) => onChange({ ...dates, midSem: e.target.value })}
                    disabled={disabled}
                />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-gray-700">
                <span>End-Sem</span>
                <Input
                    type="date"
                    value={dates.endSem}
                    onChange={(e) => onChange({ ...dates, endSem: e.target.value })}
                    disabled={disabled}
                />
            </label>
        </div>
    </div>
);

export default function ExamDates() {
    const [firstYearDates, setFirstYearDates] = useState(emptyDates);
    const [otherDates, setOtherDates] = useState(emptyDates);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadDates = async () => {
            try {
                const data = await fetchExamDates();
                setFirstYearDates(data.firstYearDates);
                setOtherDates(data.otherDates);
            } catch (err) {
                toast.error(err.message || "Failed to load exam dates");
            } finally {
                setLoading(false);
            }
        };
        loadDates();
    }, []);

    const handleSave = async () => {
        const groups = [
            ["1st Year", firstYearDates],
            ["2nd+ Year", otherDates],
        ];
        for (const [label, { midSem, endSem }] of groups) {
            if (!midSem || !endSem) {
                toast.error(`Select both dates for ${label}`);
                return;
            }
            if (endSem < midSem) {
                toast.error(`${label}: End-Sem cannot be before Mid-Sem`);
                return;
            }
        }
        try {
            setSaving(true);
            const data = await saveExamDates(firstYearDates, otherDates);
            setFirstYearDates(data.firstYearDates);
            setOtherDates(data.otherDates);
            toast.success("Exam dates saved");
        } catch (err) {
            toast.error(err.message || "Failed to save exam dates");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Exam Dates</h1>
                    <p className="text-gray-600 mt-1">
                        Mid-Sem and End-Sem dates shown to students (IST)
                    </p>
                </div>
                <Button onClick={handleSave} disabled={loading || saving}>
                    {saving ? "Saving..." : "Save"}
                </Button>
            </div>

            {loading ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                    <p>Loading...</p>
                </div>
            ) : (
                <>
                    <DateGroup
                        title="1st Year"
                        dates={firstYearDates}
                        onChange={setFirstYearDates}
                        disabled={saving}
                    />
                    <DateGroup
                        title="2nd+ Year"
                        dates={otherDates}
                        onChange={setOtherDates}
                        disabled={saving}
                    />
                </>
            )}
        </div>
    );
}
