const MessageSkeleton = () => {
  // Create an array of 6 items for skeleton bubbles
  const skeletonMessages = Array(6).fill(null);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {skeletonMessages.map((_, idx) => {
        const isAlignRight = idx % 2 === 0;
        return (
          <div key={idx} className={`chat ${isAlignRight ? "chat-end" : "chat-start"}`}>
            <div className="chat-image avatar">
              <div className="size-10 rounded-full skeleton" />
            </div>

            <div className="chat-header mb-1">
              <div className="skeleton h-3 w-16" />
            </div>

            <div className="chat-bubble bg-transparent p-0">
              <div className="skeleton h-16 w-[200px] sm:w-[250px] rounded-2xl" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageSkeleton;
