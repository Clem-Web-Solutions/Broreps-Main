import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "premium"
    size?: "default" | "sm" | "lg" | "icon"
}

const buttonVariants = ({
    variant = "default",
    size = "default",
    className,
}: {
    variant?: ButtonProps["variant"]
    size?: ButtonProps["size"]
    className?: string
}) => {
    const variants = {
        default: "bg-[#00A336] text-white hover:bg-[#00A336]/90 shadow-sm",
        destructive: "bg-red-500 text-white hover:bg-red-500/90 shadow-sm",
        outline: "border border-[#18181b] bg-transparent hover:bg-[#111] text-[#F4F4F5]",
        secondary: "bg-[#111111] text-[#F4F4F5] hover:bg-[#18181b] border border-[#18181b]",
        ghost: "hover:bg-[#111111] hover:text-[#F4F4F5] text-[#A1A1AA]",
        link: "text-[#00A336] underline-offset-4 hover:underline",
        premium: "bg-[#052e16] text-[#00FF7F] border border-[#00A336] shadow-[0_0_20px_rgba(0,163,54,0.3)] hover:bg-[#042A11] hover:shadow-[0_0_25px_rgba(0,163,54,0.4)] transition-all",
    }

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 text-[15px]",
        icon: "h-10 w-10",
    }

    return cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-[14px] font-medium ring-offset-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A336] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant!],
        sizes[size!],
        className
    )
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                className={buttonVariants({ variant, size, className })}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
