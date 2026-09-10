import { useId } from "react";
import { Button, Dialog, FormField } from "@coursehub/ui";
import Yroptions from "./year-options";
export function ConfirmDialog({
    show,
    yearName = "",
    onYearNameChange,
    onCancel,
    onConfirm,
    course,
    isLoading,
    error,
}) {
    const id = useId();
    return (
        <Dialog
            open={show}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
            title="Add Year"
            description="The year will be added to the current course."
            busy={isLoading}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" form={id} busy={isLoading} disabled={!yearName}>
                        Add
                    </Button>
                </>
            }
        >
            <form
                id={id}
                onSubmit={(event) => {
                    event.preventDefault();
                    onConfirm();
                }}
            >
                <FormField label="Year" error={error} required>
                    <select
                        value={yearName}
                        onChange={(event) => onYearNameChange(event.target.value)}
                    >
                        <option value="" disabled>
                            Select year
                        </option>
                        <Yroptions course={course} />
                    </select>
                </FormField>
            </form>
        </Dialog>
    );
}
