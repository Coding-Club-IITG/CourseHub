import { useState } from "react";
import { IconButton, Badge } from "@coursehub/ui";
import { FiFolder, FiFile, FiChevronDown, FiChevronRight, FiTrash2 } from "react-icons/fi";
import styles from "./styles.module.scss";
export default function ContentTree({ node, onAction, canManage, depth = 0 }) {
    const [open, setOpen] = useState(true),
        folder = node.childType === "Folder" || Array.isArray(node.children),
        children = node.children || [];
    return (
        <div className={styles.tree}>
            <div className={styles.row} style={{ "--depth": depth }}>
                {folder && children.length ? (
                    <IconButton
                        variant="ghost"
                        label={`${open ? "Collapse" : "Expand"} ${node.name}`}
                        aria-expanded={open}
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <FiChevronDown /> : <FiChevronRight />}
                    </IconButton>
                ) : (
                    <span className={styles.icon} aria-hidden="true">
                        {folder ? <FiFolder /> : <FiFile />}
                    </span>
                )}
                <div className={styles.name}>
                    <p>{node.name}</p>
                    {!folder && !node.isVerified && (
                        <div>
                            <Badge tone="warning">Pending review</Badge>
                        </div>
                    )}
                    {node.affectedCourses?.length > 1 && (
                        <small>Shared with {node.affectedCourses.join(", ")}</small>
                    )}
                </div>
                {canManage && node.capabilities?.canManage !== false && (
                    <IconButton
                        variant="ghost"
                        label={`Delete ${node.name}`}
                        onClick={() =>
                            onAction({
                                type: folder ? "folder" : "file",
                                id: node._id,
                                name: node.name,
                                affectedCourses: node.affectedCourses || [],
                            })
                        }
                    >
                        <FiTrash2 />
                    </IconButton>
                )}
            </div>
            {folder &&
                open &&
                children.map((child) => (
                    <ContentTree
                        key={child._id}
                        node={child}
                        onAction={onAction}
                        canManage={canManage}
                        depth={depth + 1}
                    />
                ))}
        </div>
    );
}
