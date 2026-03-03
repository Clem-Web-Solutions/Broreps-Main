import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "outline" | "destructive" | "premium"
}

const badgeVariants = ({
    variant = "default",
    className,
}: {
    variant?: BadgeProps["variant"]
    className?: string
}) => {
    const variants = {
        default: "bg-[#00A336] text-white hover:bg-[#00A336]/90 border-transparent",
        secondary: "bg-[#111111] text-[#F4F4F5] hover:bg-[#18181b] border-[#18181b] border",
        outline: "text-[#A1A1AA] border-[#18181b] border",
        destructive: "bg-red-500 text-white hover:bg-red-500/90 border-transparent",
        premium: "bg-[#052e16] text-[#00FF7F] border border-[#00A336] shadow-[0_0_10px_rgba(0,163,54,0.2)]",
    }

    return cn(
        "inline-flex items-center tracking-wide rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#00A336] focus:ring-offset-2 transition-colors",
        variants[variant!],
        className
    )
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div className={badgeVariants({ variant, className })} {...props} />
    )
}

export { Badge, badgeVariants }
