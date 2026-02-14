import { Bot, Send, Sparkles } from "lucide-react";

export function AI() {
    return (
        <div className="flex flex-col gap-6 pb-12 h-[calc(100vh-120px)]">

            {/* Header / Config Bar */}
            <div className="flex items-center justify-between p-6 bg-surface/20 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-primary border border-primary/20">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white">Assistant IA</h1>
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] font-bold uppercase rounded-full border border-green-500/20">Powered by AI</span>
                        </div>
                        <p className="text-slate-400 text-xs">Posez vos questions sur vos commandes et statistiques</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-surface/20 border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden">

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-4">

                    {/* Bot Message */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                            <Bot size={20} />
                        </div>
                        <div className="bg-surface border border-white/10 rounded-2xl rounded-tl-none p-4 max-w-[80%]">
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Bonjour ! Je suis votre assistant IA. Je peux vous aider à analyser vos commandes, statistiques, services et répondre à toutes vos questions sur vos données. Comment puis-je vous aider ?
                            </p>
                        </div>
                    </div>

                </div>

                {/* Input Area */}
                <div className="mt-6 relative">
                    <input
                        type="text"
                        placeholder="Posez votre question..."
                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl pl-6 pr-14 py-4 text-white text-sm placeholder-slate-500 outline-none focus:border-green-500/50 transition-all shadow-lg"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary hover:bg-secondary text-black rounded-lg flex items-center justify-center transition-colors">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}