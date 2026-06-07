import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-[calc(100vh-4rem)] ambient-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glass-card rounded-3xl shadow-2xl w-full max-w-6xl h-full flex overflow-hidden border border-white/20 dark:border-zinc-800/30 z-10">
        <Sidebar />
        {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </div>
  );
};

export default HomePage;