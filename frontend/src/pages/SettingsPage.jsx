import { useThemeStore } from "../store/useThemeStore";
import { Send } from "lucide-react";

const THEMES = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
];

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();

  // Mock message stream to display theme changes in a preview chat window
  const PREVIEW_MESSAGES = [
    { id: 1, text: "Hey! How is the chat app looking?", isSent: false },
    { id: 2, text: "It looks absolutely gorgeous with this theme! 🔥", isSent: true },
  ];

  return (
    <div className="h-full pt-8 max-w-4xl mx-auto p-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Theme</h1>
          <p className="text-sm text-base-content/60">Choose a color palette for your interface</p>
        </div>

        {/* Theme List Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200 ring-2 ring-primary" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary" />
                  <div className="rounded bg-secondary" />
                  <div className="rounded bg-accent" />
                  <div className="rounded bg-neutral" />
                </div>
              </div>
              <span className="text-[10px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Live Preview section */}
        <h3 className="text-lg font-semibold mt-4">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200 border-b border-base-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-semibold text-sm">
                JD
              </div>
              <div>
                <h3 className="font-medium text-sm">John Doe</h3>
                <p className="text-xs text-base-content/60">Online</p>
              </div>
            </div>
          </div>

          {/* Preview Chat Body */}
          <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
            {PREVIEW_MESSAGES.map((msg) => (
              <div key={msg.id} className={`chat ${msg.isSent ? "chat-end" : "chat-start"}`}>
                <div className="chat-image avatar">
                  <div className="w-8 h-8 rounded-full bg-neutral flex items-center justify-center text-neutral-content text-xs">
                    {msg.isSent ? "Me" : "JD"}
                  </div>
                </div>
                <div className="chat-bubble text-sm">
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Preview Chat Input */}
          <div className="p-4 border-t border-base-300 bg-base-200">
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered input-sm flex-1"
                placeholder="Type a message..."
                readOnly
              />
              <button className="btn btn-primary btn-sm btn-circle">
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;