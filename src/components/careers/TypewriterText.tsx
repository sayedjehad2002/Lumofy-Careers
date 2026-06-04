import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypewriterTextProps {
  texts: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

const TypewriterText = ({
  texts,
  className = "",
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseDuration = 2000,
}: TypewriterTextProps) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const currentFullText = texts[currentTextIndex];

    if (!isDeleting && displayText === currentFullText) {
      timeoutRef.current = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setCurrentTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      const speed = isDeleting ? deletingSpeed : typingSpeed;
      timeoutRef.current = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? currentFullText.substring(0, displayText.length - 1)
            : currentFullText.substring(0, displayText.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [displayText, isDeleting, currentTextIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        className="inline-block w-[3px] h-[1em] bg-primary ml-1 align-middle rounded-full"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
      />
    </span>
  );
};

export default TypewriterText;
