import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChatSidebar from "../../components/ChatSidebar";
import styles from "./index.module.less";

export default function BrowserLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const chatId = useMemo(() => {
    const match = location.pathname.match(/^\/chat\/(.+)$/);
    return match?.[1];
  }, [location.pathname]);

  useEffect(() => {
    if (currentPath === "/") {
      navigate("/chat", { replace: true });
    }
  }, [currentPath, navigate]);

  return (
    <div className={styles.browserLayout}>
      {/* 左侧：浏览器视图区域 (BrowserView会覆盖在这个区域上) */}
      <div className={styles.browserView}>
        <div className={styles.browserPlaceholder}>
          <div className={styles.placeholderContent}>
            <h2>浏览器视图</h2>
            <p>AI 控制的浏览器将在这里显示</p>
          </div>
        </div>
      </div>

      {/* 右侧：AI对话侧边栏 */}
      <div className={styles.chatSidebar}>
        <ChatSidebar chatId={chatId} />
      </div>
    </div>
  );
}

