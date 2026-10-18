import { memo } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import CopyButton from "./CopyButton";
import FoxMark from "./FoxMark";
import { Paw } from "./FoxTrail";
import Markdown from "./Markdown";
import { APP_NAME, displayModelId } from "@/lib/brand";
import { stripThought, type Message } from "@/lib/chat";
import { cls } from "@/lib/ui";

interface Props {
  message: Message;
  streaming: boolean;
  onRetry?: () => void; // hanya untuk jawaban terakhir
}

// memo: saat streaming, hanya pesan yang sedang berubah yang dirender ulang.
function MessageView({ message, streaming, onRetry }: Props) {
  if (message.role === "user") {
    return (
      <div className="msg msg-user">
        <div className="bubble">{message.content}</div>
      </div>
    );
  }

  // Saat streaming, blok <thought> Gemma masih ada di teks mentah; jangan ditampilkan.
  const text = stripThought(message.content);

  return (
    <div className={cls("msg msg-ai", streaming && "is-thinking")}>
      <div className="msg-head">
        <FoxMark glowing={streaming} />
        <span className="msg-name">{APP_NAME}</span>
        {message.model && <span className="msg-model">{displayModelId(message.model)}</span>}
      </div>
      <div className="msg-body">
        {text ? (
          <Markdown text={text} />
        ) : (
          streaming && (
            <p className="thinking">
              <span className="paws" aria-hidden="true">
                <Paw />
                <Paw />
                <Paw />
              </span>
              Mengendus jawaban…
            </p>
          )
        )}
        {message.stopped && <p className="msg-note">Respons dihentikan.</p>}
        {message.error && (
          <div className="msg-error" role="alert">
            <CircleAlert size={18} />
            <span>{message.error}</span>
          </div>
        )}
        {!streaming && (text || onRetry) && (
          <div className="msg-actions">
            {text && <CopyButton text={text} />}
            {onRetry && (
              <button type="button" className="icon-btn" onClick={onRetry} aria-label="Ulangi jawaban" title="Ulangi jawaban">
                <RotateCcw size={17} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MessageView);
