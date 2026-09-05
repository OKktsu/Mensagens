import { useEffect, useRef, useState } from "react";

type EmojiPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
};

const EMOJI_CATEGORIES = [
  {
    name: "😀 Rostos",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
      "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧",
      "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐",
      "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧",
      "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓",
      "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀",
      "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖"
    ],
  },
  {
    name: "👍 Gestos",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
      "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪"
    ],
  },
  {
    name: "❤️ Amor",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"
    ],
  },
  {
    name: "🎉 Símbolos",
    emojis: [
      "✨", "🌟", "💫", "🔥", "💥", "💯", "💢", "💨", "💦", "💤",
      "🕊️", "🐶", "🐱", "🍕", "🍔", "☕", "🍻", "🎉", "🎊", "🎁",
      "🏆", "🚀", "💡", "⭐", "⚡", "🔔", "🎵", "🎶", "📷", "🔍",
      "🔒", "🔑", "✅", "❌", "⚠️"
    ],
  },
];

export function EmojiPicker({ isOpen, onClose, onSelectEmoji }: EmojiPickerProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="emoji-picker-popover" role="dialog" aria-label="Seletor de Emojis">
      <div className="emoji-category-tabs">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            type="button"
            className={`emoji-tab-btn ${activeCategoryIndex === idx ? "active" : ""}`}
            onClick={() => setActiveCategoryIndex(idx)}
          >
            {cat.name.split(" ")[0]}
          </button>
        ))}
      </div>

      <div className="emoji-grid-scroll">
        <span className="emoji-category-title">{EMOJI_CATEGORIES[activeCategoryIndex].name}</span>
        <div className="emoji-grid">
          {EMOJI_CATEGORIES[activeCategoryIndex].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-btn"
              onClick={() => {
                onSelectEmoji(emoji);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
