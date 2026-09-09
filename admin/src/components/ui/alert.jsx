import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
    <div
        ref={ref}
        role="alert"
        className={cn(
            "relative w-full rounded-lg border p-4 max-h-64 overflow-y-auto",
            {
                "border-gray-200 text-gray-950": variant === "default",
                "border-red-200 text-red-800 bg-red-50": variant === "destructive",
                "border-yellow-200 text-yellow-800 bg-yellow-50": variant === "warning",
                "border-green-200 text-green-800 bg-green-50": variant === "success",
                "border-blue-200 text-blue-800 bg-blue-50": variant === "info",
            },
            className,
        )}
        {...props}
    />
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h5
        ref={ref}
        className={cn("mb-1 font-medium leading-none tracking-tight", className)}
        {...props}
    />
));
AlertTitle.displayName = "AlertTitle";

export { Alert, AlertDescription, AlertTitle };
