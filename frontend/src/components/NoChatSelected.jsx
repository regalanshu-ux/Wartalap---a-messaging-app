import { MessageSquare, Shield, Zap, Sparkles } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-8 sm:p-16 bg-base-100/20 backdrop-blur-sm select-none">
      <div className="max-w-md text-center space-y-8 animate-fade-in-up">
        {/* Icon Container */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl relative group overflow-hidden">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/15 to-transparent pointer-events-none" />
            </div>
            {/* Soft pulsing notification badge */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-base-100"></span>
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-secondary bg-clip-text text-transparent">
            Welcome to वार्तालाप!
          </h2>
          <p className="text-sm text-base-content/60 max-w-sm mx-auto leading-relaxed">
            Select a conversation from the sidebar contacts list to start chatting with your friends in real-time.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-3 pt-6 border-t border-base-content/10 max-w-xs mx-auto">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-base-100/50 border border-base-content/5">
            <Zap className="size-5 text-primary" />
            <span className="text-[10px] font-bold tracking-wide uppercase opacity-75">Fast</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-base-100/50 border border-base-content/5">
            <Shield className="size-5 text-secondary" />
            <span className="text-[10px] font-bold tracking-wide uppercase opacity-75">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-base-100/50 border border-base-content/5">
            <Sparkles className="size-5 text-accent" />
            <span className="text-[10px] font-bold tracking-wide uppercase opacity-75">Themes</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
