import { useId } from "react";
import { Button, Dialog, FormField } from "@coursehub/ui";
export function ConfirmDialog({
    show,
    inputValue = "",
    onInputChange,
    childType = "File",
    onChildTypeChange,
    onCancel,
    onConfirm,
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
            title="Add Folder"
            description="The new folder will be a subfolder of the current folder."
            busy={isLoading}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" form={id} busy={isLoading} disabled={!inputValue.trim()}>
                        Create
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
                <FormField label="Folder name" error={error} required>
                    <input
                        placeholder="Name of Folder"
                        value={inputValue}
                        onChange={onInputChange}
                    />
                </FormField>
                <FormField
                    label="Contains"
                    hint="Choose whether this folder holds files or subfolders."
                >
                    <select
                        value={childType}
                        onChange={(event) => onChildTypeChange(event.target.value)}
                    >
                        <option value="File">Files</option>
                        <option value="Folder">Folders</option>
                    </select>
                </FormField>
            </form>
        </Dialog>
    );
}
