import * as React from "react"
import { useNavigate } from "react-router"
import { motion, AnimatePresence } from "framer-motion"
import { Search, MonitorPlay, LogOut, Settings, Zap, BookOpen } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const navigate = useNavigate()
    const { logout } = useAuth()
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            setQuery("")
        }
    }, [open])

    const runCommand = React.useCallback(
        (command: () => void) => {
            setOpen(false)
            command()
        },
        []
    )

    const items = [
        {
            heading: "Navigation",
            options: [
                { id: "dashboard", name: "Tableau de Bord", icon: MonitorPlay, perform: () => runCommand(() => navigate("/dashboard")) },
                { id: "notes", name: "Mes Notes", icon: BookOpen, perform: () => runCommand(() => navigate("/notes")) },
            ],
        },
        {
            heading: "Actions rapides",
            options: [
                { id: "settings", name: "Paramètres", icon: Settings, perform: () => runCommand(() => console.log("Settings")) },
                { id: "community", name: "Communauté BroReps", icon: Zap, perform: () => runCommand(() => navigate("/dashboard")) },
                { id: "logout", name: "Se déconnecter", icon: LogOut, perform: () => runCommand(() => logout()) },
            ],
        },
    ]

    const filteredItems = React.useMemo(() => {
        if (!query) return items

        return items.map((group) => {
            return {
                ...group,
                options: group.options.filter((item) =>
                    item.name.toLowerCase().includes(query.toLowerCase())
                ),
            }
        })
            .filter((group) => group.options.length > 0)
    }, [query])

    if (!open) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm pointer-events-auto flex items-start justify-center pt-[15vh]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Overlay that closes it when clicking outside */}
                    <div className="fixed inset-0" onClick={() => setOpen(false)} />

                    <div className="relative w-full max-w-[550px] overflow-hidden rounded-[16px] bg-[#0A0A0A] border border-[#18181b] shadow-2xl">
                        <div className="flex items-center border-b border-[#18181b] px-4 py-3">
                            <Search className="w-5 h-5 text-[#52525b] mr-3" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                                className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#52525b]"
                                placeholder="Tapez une commande ou cherchez..."
                            />
                            <div className="px-2 py-1 rounded bg-[#18181b] text-[10px] text-[#A1A1AA] border border-[#27272a] ml-4 shrink-0 font-medium">ESC</div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                            {filteredItems.length === 0 ? (
                                <div className="py-14 text-center text-[13px] text-[#A1A1AA]">
                                    Aucun résultat trouvé.
                                </div>
                            ) : (
                                filteredItems.map((group, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="px-3 py-2 text-[11px] font-semibold text-[#52525b] uppercase tracking-wider">
                                            {group.heading}
                                        </div>
                                        {group.options.map((option) => {
                                            const Icon = option.icon
                                            return (
                                                <div
                                                    key={option.id}
                                                    className="flex items-center gap-3 px-3 py-3 mx-1 rounded-lg text-white hover:bg-[#18181b] transition-colors cursor-pointer group"
                                                    onClick={() => option.perform()}
                                                >
                                                    <div className="w-8 h-8 rounded-md bg-[#111111] group-hover:bg-[#27272a] border border-[#18181b] group-hover:border-[#3f3f46] flex items-center justify-center transition-all">
                                                        <Icon className="w-4 h-4 text-[#A1A1AA] group-hover:text-white transition-colors" />
                                                    </div>
                                                    <span className="text-[14px] font-medium">{option.name}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Footer */}
                        <div className="border-t border-[#18181b] px-4 py-3 bg-[#050505] flex items-center justify-end gap-4">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#52525b]">
                                <span className="font-medium bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded text-[#A1A1AA]">↑</span>
                                <span className="font-medium bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded text-[#A1A1AA]">↓</span>
                                <span>pour naviguer</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#52525b]">
                                <span className="font-medium bg-[#18181b] border border-[#27272a] px-1.5 py-0.5 rounded text-[#A1A1AA]">↵</span>
                                <span>pour valider</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
