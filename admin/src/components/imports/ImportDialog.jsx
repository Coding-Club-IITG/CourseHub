import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { Button, Dialog, FormField, LoadingState, ErrorState } from "@coursehub/ui";
import { parseImportCsv, importLimits } from "@coursehub/domain";
import { previewImport, submitImport } from "../../apis/imports";
import { getOperation, retryOperation } from "../../apis/operations";
import { library } from "../../session";
import ImportResults from "./ImportResults";
import styles from "./styles.module.scss";
const active = ["planning", "queued", "running"];
export default function ImportDialog({ type, onClose, onSuccess }) {
    const location = useLocation(),
        navigate = useNavigate(),
        id = new URLSearchParams(location.search).get("import");
    const [rows, setRows] = useState([]),
        [preview, setPreview] = useState(null),
        [errors, setErrors] = useState([]),
        [busy, setBusy] = useState(false),
        [reading, setReading] = useState(false);
    const request = useRef(null),
        sequence = useRef(0),
        reported = useRef("");
    const query = useQuery({
        queryKey: [...library.key("import"), { id, type }],
        enabled: !!id,
        queryFn: async ({ signal }) => {
            const operation = await getOperation(id, signal);
            if (operation.kind !== "import" || operation.import?.type !== type)
                throw new Error("This is not the requested import. Open Operations to review it.");
            return operation;
        },
        retry: false,
        refetchInterval: (query) => (active.includes(query.state.data?.status) ? 1000 : false),
    });
    useEffect(
        () => () => {
            sequence.current++;
            request.current?.abort();
        },
        [],
    );
    const operation = query.data;
    useEffect(() => {
        if (!operation || active.includes(operation.status)) return;
        const revision = operation.id + operation.updatedAt + operation.status;
        if (reported.current === revision) return;
        reported.current = revision;
        onSuccess?.(
            `Import ${operation.status === "completed" ? "completed" : "needs attention"}. Successful rows are retained.`,
        );
    }, [operation, onSuccess]);
    const setOperation = (id) => {
        const params = new URLSearchParams(location.search);
        if (id) params.set("import", id);
        else params.delete("import");
        navigate(
            { pathname: location.pathname, search: params.toString(), hash: location.hash },
            { replace: true },
        );
    };
    const close = () => {
        request.current?.abort();
        sequence.current++;
        setOperation(null);
        onClose();
    };
    const choose = async (event) => {
        const file = event.target.files?.[0];
        const version = ++sequence.current;
        request.current?.abort();
        request.current = new AbortController();
        setRows([]);
        setPreview(null);
        setErrors([]);
        if (!file) return;
        setReading(true);
        try {
            if (file.size > importLimits.fileBytes)
                throw new Error("Choose a CSV file no larger than 1 MiB.");
            const parsed = parseImportCsv(await file.text(), type);
            if (sequence.current !== version) return;
            if (parsed.errors.length) {
                setErrors(parsed.errors.map((error) => `Row ${error.row}: ${error.message}`));
                return;
            }
            setRows(parsed.rows);
            const result = await previewImport(type, parsed.rows, request.current.signal);
            if (sequence.current === version) setPreview(result);
        } catch (error) {
            if (sequence.current === version && !request.current.signal.aborted)
                setErrors([error.message]);
        } finally {
            if (sequence.current === version) setReading(false);
        }
    };
    const retryPreview = async () => {
        const version = ++sequence.current;
        request.current?.abort();
        request.current = new AbortController();
        setReading(true);
        setErrors([]);
        try {
            const result = await previewImport(type, rows, request.current.signal);
            if (sequence.current === version) setPreview(result);
        } catch (error) {
            if (sequence.current === version && !request.current.signal.aborted)
                setErrors([error.message]);
        } finally {
            if (sequence.current === version) setReading(false);
        }
    };
    const submit = async () => {
        if (busy || !preview) return;
        setBusy(true);
        setErrors([]);
        try {
            const accepted = await submitImport(type, rows, preview.digest, preview.requestId);
            setOperation(accepted.operationId);
        } catch (error) {
            if (error.code === "IMPORT_PREVIEW_CHANGED") setPreview(null);
            setErrors([error.message]);
        } finally {
            setBusy(false);
        }
    };
    const retry = async () => {
        setBusy(true);
        setErrors([]);
        try {
            await retryOperation(id);
            await query.refetch();
        } catch (error) {
            setErrors([error.message]);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Dialog
            open
            bodyClassName={styles.body}
            onOpenChange={(open) => {
                if (!open) close();
            }}
            title={type === "courses" ? "Import courses" : "Import BR assignments"}
            description={
                id
                    ? "Progress is saved. You can close this dialog and return through Operations."
                    : `Choose a CSV with ${type === "courses" ? "code and name" : "email"} column headers. Up to 1000 rows and 1 MiB.`
            }
            busy={busy}
            footer={
                <>
                    <Button variant="secondary" onClick={close} disabled={busy}>
                        Close
                    </Button>
                    {id ? (
                        <>
                            {operation?.canRetry && (
                                <Button busy={busy} onClick={retry}>
                                    Retry unfinished rows
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button
                            disabled={!preview?.canSubmit || reading}
                            busy={busy}
                            onClick={submit}
                        >
                            Confirm import
                        </Button>
                    )}
                </>
            }
        >
            {!id && (
                <div className={styles.input}>
                    <FormField label="CSV file">
                        <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={choose}
                            disabled={busy}
                        />
                    </FormField>
                    {reading && <LoadingState title="Checking rows…" />}
                    {!reading && rows.length > 0 && !preview && errors.length > 0 && (
                        <Button variant="secondary" onClick={retryPreview}>
                            Retry preview
                        </Button>
                    )}
                    {preview && (
                        <>
                            <p>
                                {preview.rows.length} rows reviewed. Matching data and repeated
                                identical rows will be skipped.
                            </p>
                            <ImportResults rows={preview.rows} preview />
                        </>
                    )}
                </div>
            )}
            {id && query.isPending && <LoadingState title="Loading import…" />}
            {id && query.isError && (
                <ErrorState
                    title="Could not refresh import status"
                    error={query.error}
                    onRetry={() => query.refetch()}
                />
            )}
            {operation && (
                <>
                    <p>
                        {active.includes(operation.status)
                            ? "Import in progress"
                            : operation.status === "completed"
                              ? "Import completed"
                              : "Some rows need attention"}
                    </p>
                    <ImportResults {...operation.import} />
                    {type === "brs" && (
                        <p>
                            BR results confirm saved assignments. Registration synchronization runs
                            separately in Operations.
                        </p>
                    )}
                    <Link to={`/admin/operations?operation=${id}`}>View in Operations</Link>
                </>
            )}
            {errors.length > 0 && (
                <div role="alert" className={styles.error}>
                    <p>Import could not proceed.</p>
                    <ul>
                        {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}
        </Dialog>
    );
}
