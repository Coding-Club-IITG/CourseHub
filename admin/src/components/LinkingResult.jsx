export default function LinkingResult({ result, completed = true }) {
    if (!result) return null;
    return (
        <div className="mt-3 min-w-0 space-y-2 break-words text-sm text-gray-800">
            <p className="font-semibold">
                {result.sourceCode} → {result.targetCode}
            </p>
            <p>
                {completed ? "Linked" : "Planned"}: {result.linked.length}{" "}
                {result.linked.length === 1 ? "year" : "years"}. Already linked:{" "}
                {result.alreadyLinked.length}. Empty replacements: {result.replaced.length}.
            </p>
            {result.conflicts.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3" role="status">
                    <p className="font-semibold">
                        {result.conflicts.length} year{" "}
                        {result.conflicts.length === 1 ? "conflict" : "conflicts"} - content
                        preserved
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5">
                        {result.conflicts.map((conflict, index) => (
                            <li key={index}>
                                <strong>{conflict.year}</strong>: {conflict.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
